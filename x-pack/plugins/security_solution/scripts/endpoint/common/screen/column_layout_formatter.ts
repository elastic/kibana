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
import { HORIZONTAL_LINE } from '../constants';
import { DataFormatter } from './data_formatter';

const MAX_SCREEN_LINE_WIDTH = HORIZONTAL_LINE.length;

interface ColumnLayoutFormatterOptions {
  /**
   * The width (percentage) for each of the columns. Example: 80 (for 80%).
   */
  widths?: number[];
}

export class ColumnLayoutFormatter extends DataFormatter {
  private readonly colSeparator = ` ${blue('\u2506')} `;

  constructor(
    private readonly columns: Array<string | DataFormatter>,
    private readonly options: ColumnLayoutFormatterOptions = {}
  ) {
    super();
  }

  protected getOutput(): string {
    const colSeparator = this.colSeparator;
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
        .join(colSeparator)}\n`;
    }

    return output;
  }

  private calculateColumnSizes(): number[] {
    const widths = this.options.widths ?? [];
    const defaultWidthPrct = Math.floor(100 / this.columns.length);

    return this.columns.map((_, colIndex) => {
      return Math.floor(MAX_SCREEN_LINE_WIDTH * ((widths[colIndex] ?? defaultWidthPrct) / 100));
    });
  }

  private fillColumnToWidth(colData: string, width: number) {
    const countOfControlChar = (colData.match(ansiRegex()) || []).length;
    const colDataNoControlChar = stripAnsi(colData);
    const colDataFilled = colDataNoControlChar.padEnd(width).substring(0, width);
    const fillCount = colDataFilled.length - colDataNoControlChar.length;

    return colData + (fillCount > 0 ? ' '.repeat(fillCount - countOfControlChar) : '');
  }
}
