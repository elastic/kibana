/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IScopedClusterClient, IUiSettingsClient, Logger } from 'kibana/server';
import type { IScopedSearchClient } from 'src/plugins/data/server';
import type { Datatable } from 'src/plugins/expressions/server';
import type { Writable } from 'stream';
import { lastValueFrom } from 'rxjs';
import type { ReportingConfig } from '../../..';
import type {
  DataView,
  ISearchSource,
  ISearchStartSearchSource,
} from '../../../../../../../src/plugins/data/common';
import {
  cellHasFormulas,
  ES_SEARCH_STRATEGY,
  tabifyDocs,
} from '../../../../../../../src/plugins/data/common';
import type {
  FieldFormat,
  FieldFormatConfig,
  IFieldFormatsRegistry,
} from '../../../../../../../src/plugins/field_formats/common';
import type { CancellationToken } from '../../../../common/cancellation_token';
import { CONTENT_TYPE_CSV } from '../../../../common/constants';
import { AuthenticationExpiredError, ReportingError } from '../../../../common/errors';
import { byteSizeValueToNumber } from '../../../../common/schema_utils';
import type { TaskRunResult } from '../../../lib/tasks';
import type { JobParamsCSV } from '../types';
import { CsvExportSettings, getExportSettings } from './get_export_settings';
import { i18nTexts } from './i18n_texts';
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

export class CsvGenerator {
  private csvContainsFormulas = false;
  private maxSizeReached = false;
  private csvRowCount = 0;

  constructor(
    private job: Omit<JobParamsCSV, 'version'>,
    private config: ReportingConfig,
    private clients: Clients,
    private dependencies: Dependencies,
    private cancellationToken: CancellationToken,
    private logger: Logger,
    private stream: Writable
  ) {}

  private async scan(index: DataView, searchSource: ISearchSource, settings: CsvExportSettings) {
    const { scroll: scrollSettings, includeFrozen } = settings;
    const searchBody = searchSource.getSearchRequestBody();
    this.logger.debug(`executing search request`);
    const searchParams = {
      params: {
        body: searchBody,
        index: index.title,
        scroll: scrollSettings.duration,
        size: scrollSettings.size,
        ignore_throttled: includeFrozen ? false : undefined, // "true" will cause deprecation warnings logged in ES
      },
    };

    const results = (
      await lastValueFrom(this.clients.data.search(searchParams, { strategy: ES_SEARCH_STRATEGY }))
    ).rawResponse as estypes.SearchResponse<unknown>;

    return results;
  }

  private async scroll(scrollId: string, scrollSettings: CsvExportSettings['scroll']) {
    this.logger.debug(`executing scroll request`);

    return await this.clients.es.asCurrentUser.scroll({
      scroll: scrollSettings.duration,
      scroll_id: scrollId,
    });
  }

  /*
   * Load field formats for each field in the list
   */
  private getFormatters(table: Datatable) {
    // initialize field formats
    const formatters: Record<string, FieldFormat> = {};
    table.columns.forEach((c) => {
      const fieldFormat = this.dependencies.fieldFormatsRegistry.deserialize(c.meta.params);
      formatters[c.id] = fieldFormat;
    });

    return formatters;
  }

  private escapeValues(settings: CsvExportSettings) {
    return (value: string) => {
      if (settings.checkForFormulas && cellHasFormulas(value)) {
        this.csvContainsFormulas = true; // set warning if cell value has a formula
      }
      return settings.escapeValue(value);
    };
  }

  private getColumnsFromTabify(table: Datatable) {
    const columnIds = table.columns.map((c) => c.id);
    columnIds.sort();
    return columnIds;
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
  private async generateRows(
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

      /*
       * Intrinsically, generating the rows is a synchronous process. Awaiting
       * on a setImmediate call here partititions what could be a very long and
       * CPU-intenstive synchronous process into an asychronous process. This
       * give NodeJS to process other asychronous events that wait on the Event
       * Loop.
       *
       * See: https://nodejs.org/en/docs/guides/dont-block-the-event-loop/
       *
       * It's likely this creates a lot of context switching, and adds to the
       * time it would take to generate the CSV. There are alternatives to the
       * chosen performance solution:
       *
       * 1. Partition the synchronous process with fewer partitions, by using
       * the loop counter to call setImmediate only every N amount of rows.
       * Testing is required to see what the best N value for most data will
       * be.
       *
       * 2. Use a C++ add-on to generate the CSV using the Node Worker Pool
       * instead of using the Event Loop
       */
      await new Promise(setImmediate);

      const rowDefinition: string[] = [];
      const format = this.formatCellValues(formatters);
      const escape = this.escapeValues(settings);

      for (const column of columns) {
        rowDefinition.push(escape(format({ column, data: dataTableRow[column] })));
      }

      if (!builder.tryAppend(rowDefinition.join(settings.separator) + '\n')) {
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
    let reportingError: undefined | ReportingError;

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
          this.logger.warn(`Search results are undefined!`);
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
          table = tabifyDocs(results, index, { shallow: true, includeIgnoredValues: true });
        } catch (err) {
          this.logger.error(err);
        }

        if (!table) {
          break;
        }

        let columns: string[];
        if (this.job.columns && this.job.columns.length > 0) {
          columns = this.job.columns;
        } else {
          columns = this.getColumnsFromTabify(table);
        }

        if (first) {
          first = false;
          this.generateHeader(columns, builder, settings);
        }

        if (table.rows.length < 1) {
          break; // empty report with just the header
        }

        const formatters = this.getFormatters(table);
        await this.generateRows(columns, table, builder, formatters, settings);

        // update iterator
        currentRecord += table.rows.length;
      } while (currentRecord < totalRecords - 1);

      // Add warnings to be logged
      if (this.csvContainsFormulas && escapeFormulaValues) {
        warnings.push(i18nTexts.escapedFormulaValuesMessage);
      }
    } catch (err) {
      this.logger.error(err);
      if (err instanceof esErrors.ResponseError) {
        if ([401, 403].includes(err.statusCode ?? 0)) {
          reportingError = new AuthenticationExpiredError();
          warnings.push(i18nTexts.authenticationError.partialResultsMessage);
        } else {
          warnings.push(i18nTexts.esErrorMessage(err.statusCode ?? 0, String(err.body)));
        }
      } else {
        warnings.push(i18nTexts.unknownError(err?.message));
      }
    } finally {
      // clear scrollID
      if (scrollId) {
        this.logger.debug(`executing clearScroll request`);
        try {
          await this.clients.es.asCurrentUser.clearScroll({ scroll_id: [scrollId] });
        } catch (err) {
          this.logger.error(err);
        }
      } else {
        this.logger.warn(`No scrollId to clear!`);
      }
    }

    this.logger.debug(`Finished generating. Row count: ${this.csvRowCount}.`);

    if (!this.maxSizeReached && this.csvRowCount !== totalRecords) {
      this.logger.warn(
        `ES scroll returned fewer total hits than expected! ` +
          `Search result total hits: ${totalRecords}. Row count: ${this.csvRowCount}.`
      );
    }

    return {
      content_type: CONTENT_TYPE_CSV,
      csv_contains_formulas: this.csvContainsFormulas && !escapeFormulaValues,
      max_size_reached: this.maxSizeReached,
      metrics: {
        csv: { rows: this.csvRowCount },
      },
      warnings,
      error_code: reportingError?.code,
    };
  }
}
