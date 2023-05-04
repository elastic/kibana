/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stripAnsi from 'strip-ansi';
// eslint-disable-next-line import/no-extraneous-dependencies
import ansiRegex from 'ansi-regex'; // its a dependency of `strip-ansi` so it should be fine
import { blue } from 'chalk';
import { DataFormatter } from './data_formatter';
import { SCREEN_ROW_MAX_WIDTH } from './constants';

interface ColumnLayoutFormatterOptions {
  /**
   * The width (percentage) for each of the columns. Example: 80 (for 80%).
   */
  widths?: number[];

  /** The column separator */
  separator?: string;

  /** The max length for each screen row. Defaults to the overall screen width */
  rowLength?: number;
}

export class ColumnLayoutFormatter extends DataFormatter {
  private readonly defaultSeparator = ` ${blue('\u2506')} `;

  constructor(
    private readonly columns: Array<string | DataFormatter>,
    private readonly options: ColumnLayoutFormatterOptions = {}
  ) {
    super();
  }

  protected getOutput(): string {
    const colSeparator = this.options.separator ?? this.defaultSeparator;
    let rowCount = 0;
    const columnData: string[][] = this.columns.map((item) => {
      const itemOutput = (typeof item === 'string' ? item : item.output).split('\n');

      rowCount = Math.max(rowCount, itemOutput.length);

      return itemOutput;
    });
    const columnSizes = this.calculateColumnSizes();
    let output = '';

    let row = 0;
    while (row < rowCount) {
      const rowIndex = row++;

      output += `${columnData
        .map((columnDataRows, colIndex) => {
          return this.fillColumnToWidth(columnDataRows[rowIndex] ?? '', columnSizes[colIndex]);
        })
        .join(colSeparator)}`;

      if (row !== rowCount) {
        output += '\n';
      }
    }

    return output;
  }

  private calculateColumnSizes(): number[] {
    const maxWidth = this.options.rowLength ?? SCREEN_ROW_MAX_WIDTH;
    const widths = this.options.widths ?? [];
    const defaultWidthPrct = Math.floor(100 / this.columns.length);

    return this.columns.map((_, colIndex) => {
      return Math.floor(maxWidth * ((widths[colIndex] ?? defaultWidthPrct) / 100));
    });
  }

  private fillColumnToWidth(colData: string, width: number) {
    const countOfControlChar = (colData.match(ansiRegex()) || []).length;
    const colDataNoControlChar = stripAnsi(colData);
    const colDataFilled = colDataNoControlChar.padEnd(width).substring(0, width);
    const fillCount = colDataFilled.length - colDataNoControlChar.length - countOfControlChar;

    return colData + (fillCount > 0 ? ' '.repeat(fillCount) : '');
  }
}
