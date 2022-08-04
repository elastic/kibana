/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataFormatter } from './data_formatter';

export class ChoiceListFormatter extends DataFormatter {
  private readonly outputContent: string;

  constructor(private readonly choiceList: string[]) {
    super();

    this.outputContent = `\n${this.choiceList
      .map((choice, index) => `  [${index + 1}] ${choice}`)
      .join('\n')}\n`;
  }

  protected getOutput(): string {
    return this.outputContent;
  }
}
