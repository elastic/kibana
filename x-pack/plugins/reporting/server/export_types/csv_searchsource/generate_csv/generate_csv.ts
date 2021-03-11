/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient, IUiSettingsClient } from 'src/core/server';
import { IScopedSearchClient } from 'src/plugins/data/server';
import { Datatable, DatatableColumn, DatatableRow } from 'src/plugins/expressions/server';
import { ReportingConfig } from '../../..';
import {
  ES_SEARCH_STRATEGY,
  FieldFormat,
  FieldFormatConfig,
  IFieldFormatsRegistry,
  IndexPattern,
  ISearchSource,
  ISearchStartSearchSource,
  SearchFieldValue,
  tabifyDocs,
} from '../../../../../../../src/plugins/data/common';
import { CancellationToken } from '../../../../common';
import { CONTENT_TYPE_CSV } from '../../../../common/constants';
import { byteSizeValueToNumber } from '../../../../common/schema_utils';
import { LevelLogger } from '../../../lib';
import { TaskRunResult } from '../../../lib/tasks';
import { JobParamsCSV } from '../types';
import { cellHasFormulas } from './cell_has_formula';
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

export class CsvGenerator {
  private _columnMap: number[] | null = null;
  private _formatters: Record<string, FieldFormat> | null = null;
  private csvContainsFormulas = false;
  private maxSizeReached = false;
  private csvRowCount = 0;

  constructor(
    private job: JobParamsCSV,
    private config: ReportingConfig,
    private clients: Clients,
    private dependencies: Dependencies,
    private cancellationToken: CancellationToken,
    private logger: LevelLogger
  ) {}

  private async scan(
    index: IndexPattern,
    searchSource: ISearchSource,
    scrollSettings: CsvExportSettings['scroll']
  ) {
    const searchBody = await searchSource.getSearchRequestBody();
    this.logger.debug(`executing search request`);
    const searchParams = {
      params: {
        body: searchBody,
        index: index.title,
        scroll: scrollSettings.duration,
        size: scrollSettings.size,
      },
    };
    const results = (
      await this.clients.data.search(searchParams, { strategy: ES_SEARCH_STRATEGY }).toPromise()
    ).rawResponse;

    return results;
  }

  private async scroll(scrollId: string, scrollSettings: CsvExportSettings['scroll']) {
    this.logger.debug(`executing scroll request`);
    const results = (
      await this.clients.es.asCurrentUser.scroll({
        scroll: scrollSettings.duration,
        scroll_id: scrollId,
      })
    ).body as SearchResponse<unknown>;
    return results;
  }

  /*
   * Build a map for ordering the fields of search results into CSV columns
   */
  private getColumnMap(fields: SearchFieldValue[] | undefined, table: Datatable) {
    if (this._columnMap) {
      return this._columnMap;
    }

    // if there are selected fields, re-initialize columnMap with field order is set in searchSource fields
    if (fields && fields[0] !== '*') {
      this._columnMap = fields.map((field) =>
        table.columns.findIndex((column) => column.id === field)
      );
    }

    // initialize default columnMap, works if fields are asterisk and order doesn't matter
    if (!this._columnMap) {
      this._columnMap = table.columns.map((c, columnIndex) => columnIndex);
    }

    return this._columnMap;
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

  private checkForFormulas(settings: CsvExportSettings) {
    return (value: string) => {
      if (settings.checkForFormulas && cellHasFormulas(value)) {
        this.csvContainsFormulas = true; // set warning if cell value has a formula
      }
      return settings.escapeValue(value);
    };
  }

  private getFields(searchSource: ISearchSource): SearchFieldValue[] {
    const fieldValues: Record<string, string | boolean | SearchFieldValue[] | undefined> = {
      fields: searchSource.getField('fields'),
      fieldsFromSource: searchSource.getField('fieldsFromSource'),
    };
    const fieldSource = fieldValues.fieldsFromSource ? 'fieldsFromSource' : 'fields';
    this.logger.info(`Getting search source fields from: '${fieldSource}'`);

    let fields = fieldValues[fieldSource];
    if (fields === true || typeof fields === 'string') {
      fields = [fields.toString()];
    }
    if (fields == null) {
      fields = ['undefined'];
    }
    if (!fields) {
      fields = ['false'];
    }

    return fields;
  }

  private getColumnName(fields: SearchFieldValue[] | undefined, table: Datatable) {
    return (columnIndex: number, position: number) => {
      let cell: string;
      if (columnIndex > -1) {
        cell = table.columns[columnIndex].name;
      } else {
        cell = fields && fields[position] ? (fields[position] as string) : 'unknown';
      }
      return cell;
    };
  }

  private tryToParseCellValues(
    formatters: Record<string, FieldFormat>,
    dataTableRow: DatatableRow
  ) {
    return (tableColumn: DatatableColumn) => {
      let cell: string[] | string = formatters[tableColumn.id].convert(
        dataTableRow[tableColumn.id]
      );

      try {
        // expected values are a string of JSON where the value(s) is in an array
        cell = JSON.parse(cell);
      } catch (e) {
        // ignore
      }

      // We have to strip singular array values out of their array wrapper,
      // So that the value appears the visually the same as seen in Discover
      if (Array.isArray(cell)) {
        cell = cell.join(', '); // mimic Discover behavior
      }

      return cell;
    };
  }

  /*
   * Use the list of fields to generate the header row
   */
  private generateHeader(
    fields: SearchFieldValue[] | undefined,
    table: Datatable,
    builder: MaxSizeStringBuilder,
    settings: CsvExportSettings
  ) {
    this.logger.debug(`Building CSV header row...`);
    const columnMap = this.getColumnMap(fields, table);

    const header =
      columnMap
        .map(this.getColumnName(fields, table))
        .map(this.checkForFormulas(settings))
        .join(settings.separator) + `\n`;

    if (!builder.tryAppend(header)) {
      return {
        size: 0,
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
    fields: SearchFieldValue[] | undefined,
    table: Datatable,
    builder: MaxSizeStringBuilder,
    formatters: Record<string, FieldFormat>,
    settings: CsvExportSettings
  ) {
    this.logger.debug(`Building ${table.rows.length} CSV data rows...`);
    const columnMap = this.getColumnMap(fields, table);

    for (const dataTableRow of table.rows) {
      if (this.cancellationToken.isCancelled()) {
        break;
      }

      const row =
        columnMap
          .map((columnIndex) => table.columns[columnIndex])
          .map(this.tryToParseCellValues(formatters, dataTableRow))
          .map(this.checkForFormulas(settings))
          .join(settings.separator) + '\n';

      if (!builder.tryAppend(row)) {
        this.logger.warn('max Size Reached');
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
      throw new Error(`The search must have a revference to an index pattern!`);
    }

    const { maxSizeBytes, bom, escapeFormulaValues, scroll: scrollSettings } = settings;

    const builder = new MaxSizeStringBuilder(byteSizeValueToNumber(maxSizeBytes), bom);
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
        let results: SearchResponse<unknown> | undefined;
        if (scrollId == null) {
          // open a scroll cursor in Elasticsearch
          results = await this.scan(index, searchSource, scrollSettings);
          scrollId = results?._scroll_id;
          if (results.hits?.total != null) {
            totalRecords = results.hits.total;
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

        let table: Datatable | undefined;
        try {
          table = tabifyDocs(results, index, { shallow: true, meta: true });
        } catch (err) {
          this.logger.error(err);
        }

        if (!table) {
          break;
        }

        // write the header and initialize formatters / column orderings
        // depends on the table to know what order to place the columns
        const fields = this.getFields(searchSource);

        if (first) {
          first = false;
          this.generateHeader(fields, table, builder, settings);
        }

        if (table.rows.length < 1) {
          break; // empty report with just the header
        }

        const formatters = this.getFormatters(table);
        this.generateRows(fields, table, builder, formatters, settings);

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

    const size = builder.getSizeInBytes();
    this.logger.debug(
      `Finished generating. Total size in bytes: ${size}. Row count: ${this.csvRowCount}.`
    );

    return {
      content: builder.getString(),
      content_type: CONTENT_TYPE_CSV,
      csv_contains_formulas: this.csvContainsFormulas && !escapeFormulaValues,
      max_size_reached: this.maxSizeReached,
      size,
      warnings,
    };
  }
}
