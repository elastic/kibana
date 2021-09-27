/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Writable } from 'stream';
import { i18n } from '@kbn/i18n';
import type { estypes } from '@elastic/elasticsearch';
import { IScopedClusterClient, IUiSettingsClient } from 'src/core/server';
import { IScopedSearchClient } from 'src/plugins/data/server';
import { Datatable } from 'src/plugins/expressions/server';
import { ReportingConfig } from '../../..';
import {
  cellHasFormulas,
  ES_SEARCH_STRATEGY,
  IndexPattern,
  ISearchSource,
  ISearchStartSearchSource,
  SearchFieldValue,
  SearchSourceFields,
  tabifyDocs,
} from '../../../../../../../src/plugins/data/common';
import {
  FieldFormat,
  FieldFormatConfig,
  IFieldFormatsRegistry,
} from '../../../../../../../src/plugins/field_formats/common';
import { KbnServerError } from '../../../../../../../src/plugins/kibana_utils/server';
import { CancellationToken } from '../../../../common';
import { CONTENT_TYPE_CSV } from '../../../../common/constants';
import { byteSizeValueToNumber } from '../../../../common/schema_utils';
import { LevelLogger } from '../../../lib';
import { TaskRunResult } from '../../../lib/tasks';
import { JobParamsCSV } from '../types';
import { CsvExportSettings, getExportSettings } from './get_export_settings';
import { MaxSizeStringBuilder } from './max_size_string_builder';

interface Clients {
  es: IScopedClusterClient;
  data: IScopedSearchClient;
  uiSettings: IUiSettingsClient;
}

interface Dependencies {
  searchSourceStart: ISearchStartSearchSource;
  fieldFormatsRegistry: IFieldFormatsRegistry;
}

// Function to check if the field name values can be used as the header row
function isPlainStringArray(
  fields: SearchFieldValue[] | string | boolean | undefined
): fields is string[] {
  let result = true;
  if (Array.isArray(fields)) {
    fields.forEach((field) => {
      if (typeof field !== 'string' || field === '*' || field === '_source') {
        result = false;
      }
    });
  }
  return result;
}

export class CsvGenerator {
  private _columns?: string[];
  private _formatters?: Record<string, FieldFormat>;
  private csvContainsFormulas = false;
  private maxSizeReached = false;
  private csvRowCount = 0;

  constructor(
    private job: Omit<JobParamsCSV, 'version'>,
    private config: ReportingConfig,
    private clients: Clients,
    private dependencies: Dependencies,
    private cancellationToken: CancellationToken,
    private logger: LevelLogger,
    private stream: Writable
  ) {}

  private async scan(
    index: IndexPattern,
    searchSource: ISearchSource,
    settings: CsvExportSettings
  ) {
    const { scroll: scrollSettings, includeFrozen } = settings;
    const searchBody = searchSource.getSearchRequestBody();
    this.logger.debug(`executing search request`);
    const searchParams = {
      params: {
        body: searchBody,
        index: index.title,
        scroll: scrollSettings.duration,
        size: scrollSettings.size,
        ignore_throttled: !includeFrozen,
      },
    };

    const results = (
      await this.clients.data.search(searchParams, { strategy: ES_SEARCH_STRATEGY }).toPromise()
    ).rawResponse as estypes.SearchResponse<unknown>;

    return results;
  }

  private async scroll(scrollId: string, scrollSettings: CsvExportSettings['scroll']) {
    this.logger.debug(`executing scroll request`);
    const results = (
      await this.clients.es.asCurrentUser.scroll({
        body: {
          scroll: scrollSettings.duration,
          scroll_id: scrollId,
        },
      })
    ).body;
    return results;
  }

  /*
   * Load field formats for each field in the list
   */
  private getFormatters(table: Datatable) {
    if (this._formatters) {
      return this._formatters;
    }

    // initialize field formats
    const formatters: Record<string, FieldFormat> = {};
    table.columns.forEach((c) => {
      const fieldFormat = this.dependencies.fieldFormatsRegistry.deserialize(c.meta.params);
      formatters[c.id] = fieldFormat;
    });

    this._formatters = formatters;
    return this._formatters;
  }

  private escapeValues(settings: CsvExportSettings) {
    return (value: string) => {
      if (settings.checkForFormulas && cellHasFormulas(value)) {
        this.csvContainsFormulas = true; // set warning if cell value has a formula
      }
      return settings.escapeValue(value);
    };
  }

  private getColumns(searchSource: ISearchSource, table: Datatable) {
    if (this._columns != null) {
      return this._columns;
    }

    // if columns is not provided in job params,
    // default to use fields/fieldsFromSource from the searchSource to get the ordering of columns
    const getFromSearchSource = (): string[] => {
      const fieldValues: Pick<SearchSourceFields, 'fields' | 'fieldsFromSource'> = {
        fields: searchSource.getField('fields'),
        fieldsFromSource: searchSource.getField('fieldsFromSource'),
      };
      const fieldSource = fieldValues.fieldsFromSource ? 'fieldsFromSource' : 'fields';
      this.logger.debug(`Getting columns from '${fieldSource}' in search source.`);

      const fields = fieldValues[fieldSource];
      // Check if field name values are string[] and if the fields are user-defined
      if (isPlainStringArray(fields)) {
        return fields;
      }

      // Default to using the table column IDs as the fields
      const columnIds = table.columns.map((c) => c.id);
      // Fields in the API response don't come sorted - they need to be sorted client-side
      columnIds.sort();
      return columnIds;
    };
    this._columns = this.job.columns?.length ? this.job.columns : getFromSearchSource();

    return this._columns;
  }

  private formatCellValues(formatters: Record<string, FieldFormat>) {
    return ({
      column: tableColumn,
      data: dataTableCell,
    }: {
      column: string;
      data: unknown;
    }): string => {
      let cell: string[] | string | object;
      // check truthiness to guard against _score, _type, etc
      if (tableColumn && dataTableCell) {
        try {
          cell = formatters[tableColumn].convert(dataTableCell);
        } catch (err) {
          this.logger.error(err);
          cell = '-';
        }

        try {
          // expected values are a string of JSON where the value(s) is in an array
          cell = JSON.parse(cell);
        } catch (e) {
          // ignore
        }

        // We have to strip singular array values out of their array wrapper,
        // So that the value appears the visually the same as seen in Discover
        if (Array.isArray(cell)) {
          cell = cell.map((c) => (typeof c === 'object' ? JSON.stringify(c) : c)).join(', ');
        }

        // Check for object-type value (geoip)
        if (typeof cell === 'object') {
          cell = JSON.stringify(cell);
        }

        return cell;
      }

      return '-'; // Unknown field: it existed in searchSource but has no value in the result
    };
  }

  /*
   * Use the list of columns to generate the header row
   */
  private generateHeader(
    columns: string[],
    builder: MaxSizeStringBuilder,
    settings: CsvExportSettings
  ) {
    this.logger.debug(`Building CSV header row...`);
    const header = columns.map(this.escapeValues(settings)).join(settings.separator) + '\n';

    if (!builder.tryAppend(header)) {
      return {
        content: '',
        maxSizeReached: true,
        warnings: [],
      };
    }
  }

  /*
   * Format a Datatable into rows of CSV content
   */
  private generateRows(
    columns: string[],
    table: Datatable,
    builder: MaxSizeStringBuilder,
    formatters: Record<string, FieldFormat>,
    settings: CsvExportSettings
  ) {
    this.logger.debug(`Building ${table.rows.length} CSV data rows...`);
    for (const dataTableRow of table.rows) {
      if (this.cancellationToken.isCancelled()) {
        break;
      }

      const row =
        columns
          .map((f) => ({ column: f, data: dataTableRow[f] }))
          .map(this.formatCellValues(formatters))
          .map(this.escapeValues(settings))
          .join(settings.separator) + '\n';

      if (!builder.tryAppend(row)) {
        this.logger.warn(`Max Size Reached after ${this.csvRowCount} rows.`);
        this.maxSizeReached = true;
        if (this.cancellationToken) {
          this.cancellationToken.cancel();
        }
        break;
      }

      this.csvRowCount++;
    }
  }

  public async generateData(): Promise<TaskRunResult> {
    const [settings, searchSource] = await Promise.all([
      getExportSettings(
        this.clients.uiSettings,
        this.config,
        this.job.browserTimezone,
        this.logger
      ),
      this.dependencies.searchSourceStart.create(this.job.searchSource),
    ]);

    const index = searchSource.getField('index');

    if (!index) {
      throw new Error(`The search must have a reference to an index pattern!`);
    }

    const { maxSizeBytes, bom, escapeFormulaValues, scroll: scrollSettings } = settings;

    const builder = new MaxSizeStringBuilder(this.stream, byteSizeValueToNumber(maxSizeBytes), bom);
    const warnings: string[] = [];
    let first = true;
    let currentRecord = -1;
    let totalRecords = 0;
    let scrollId: string | undefined;

    // apply timezone from the job to all date field formatters
    try {
      index.fields.getByType('date').forEach(({ name }) => {
        this.logger.debug(`setting timezone on ${name}`);
        const format: FieldFormatConfig = {
          ...index.fieldFormatMap[name],
          id: index.fieldFormatMap[name]?.id || 'date', // allow id: date_nanos
          params: {
            ...index.fieldFormatMap[name]?.params,
            timezone: settings.timezone,
          },
        };
        index.setFieldFormat(name, format);
      });
    } catch (err) {
      this.logger.error(err);
    }

    try {
      do {
        if (this.cancellationToken.isCancelled()) {
          break;
        }
        let results: estypes.SearchResponse<unknown> | undefined;
        if (scrollId == null) {
          // open a scroll cursor in Elasticsearch
          results = await this.scan(index, searchSource, settings);
          scrollId = results?._scroll_id;
          if (results.hits?.total != null) {
            totalRecords = results.hits.total as number;
            this.logger.debug(`Total search results: ${totalRecords}`);
          }
        } else {
          // use the scroll cursor in Elasticsearch
          results = await this.scroll(scrollId, scrollSettings);
        }

        if (!results) {
          this.logger.warning(`Search results are undefined!`);
          break;
        }

        // TODO check for shard failures, log them and add a warning if found
        {
          const {
            hits: { hits, ...hitsMeta },
            ...header
          } = results;
          this.logger.debug('Results metadata: ' + JSON.stringify({ header, hitsMeta }));
        }

        let table: Datatable | undefined;
        try {
          table = tabifyDocs(results, index, { shallow: true, meta: true });
        } catch (err) {
          this.logger.error(err);
        }

        if (!table) {
          break;
        }

        // If columns exists in the job params, use it to order the CSV columns
        // otherwise, get the ordering from the searchSource's fields / fieldsFromSource
        const columns = this.getColumns(searchSource, table) || [];

        if (first) {
          first = false;
          this.generateHeader(columns, builder, settings);
        }

        if (table.rows.length < 1) {
          break; // empty report with just the header
        }

        const formatters = this.getFormatters(table);
        this.generateRows(columns, table, builder, formatters, settings);

        // update iterator
        currentRecord += table.rows.length;
      } while (currentRecord < totalRecords - 1);

      // Add warnings to be logged
      if (this.csvContainsFormulas && escapeFormulaValues) {
        warnings.push(
          i18n.translate('xpack.reporting.exportTypes.csv.generateCsv.escapedFormulaValues', {
            defaultMessage: 'CSV may contain formulas whose values have been escaped',
          })
        );
      }
    } catch (err) {
      this.logger.error(err);
      if (err instanceof KbnServerError && err.errBody) {
        throw JSON.stringify(err.errBody.error);
      }
    } finally {
      // clear scrollID
      if (scrollId) {
        this.logger.debug(`executing clearScroll request`);
        try {
          await this.clients.es.asCurrentUser.clearScroll({ body: { scroll_id: [scrollId] } });
        } catch (err) {
          this.logger.error(err);
        }
      } else {
        this.logger.warn(`No scrollId to clear!`);
      }
    }

    this.logger.debug(`Finished generating. Row count: ${this.csvRowCount}.`);

    // FIXME: https://github.com/elastic/kibana/issues/112186 -- find root cause
    if (!this.maxSizeReached && this.csvRowCount !== totalRecords) {
      this.logger.warning(
        `ES scroll returned fewer total hits than expected! ` +
          `Search result total hits: ${totalRecords}. Row count: ${this.csvRowCount}.`
      );
    }

    return {
      content_type: CONTENT_TYPE_CSV,
      csv_contains_formulas: this.csvContainsFormulas && !escapeFormulaValues,
      max_size_reached: this.maxSizeReached,
      warnings,
    };
  }
}
