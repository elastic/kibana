/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HORIZONTAL_LINE } from '../constants';
import { DataFormatter } from './data_formatter';

const MAX_WIDTH = HORIZONTAL_LINE.length - 14;

export class ProgressFormatter extends DataFormatter {
  private percentDone: number = 0;

  public setProgress(percentDone: number) {
    this.percentDone = percentDone;
  }

  protected getOutput(): string {
    const repeatValue = Math.ceil(MAX_WIDTH * (this.percentDone / 100));

    return `\n  [ ${'='.repeat(repeatValue).padEnd(MAX_WIDTH)} ] ${this.percentDone}%\n`;
  }
}
