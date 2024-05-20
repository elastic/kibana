/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { green } from 'chalk';
import { isChoice } from './type_gards';
import type { Choice } from './types';
import { DataFormatter } from './data_formatter';

type ChoiceMenuFormatterItems = string[] | Choice[];

interface ChoiceMenuFormatterOptions {
  layout: 'vertical' | 'horizontal';
}

const getDefaultOptions = (): ChoiceMenuFormatterOptions => {
  return {
    layout: 'vertical',
  };
};

/**
 * Formatter for displaying lists of choices
 */
export class ChoiceMenuFormatter extends DataFormatter {
  private readonly outputContent: string;

  constructor(
    private readonly choiceList: ChoiceMenuFormatterItems,
    private readonly options: ChoiceMenuFormatterOptions = getDefaultOptions()
  ) {
    super();

    const list = this.buildList();

    this.outputContent = `${list.join(this.options.layout === 'horizontal' ? '   ' : '\n')}`;
  }

  protected getOutput(): string {
    return this.outputContent;
  }

  private buildList(): string[] {
    return this.choiceList.map((choice, index) => {
      let key: string = `${index + 1}`;
      let title: string = '';

      if (isChoice(choice)) {
        key = choice.key;
        title = choice.title;
      } else {
        title = choice;
      }

      return green(`[${key}] `) + title;
    });
  }
}
