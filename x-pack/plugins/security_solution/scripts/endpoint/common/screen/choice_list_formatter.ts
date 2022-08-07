/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isChoice } from './type_gards';
import type { Choice } from './types';
import { DataFormatter } from './data_formatter';

type ChoiceListFormatterItems = string[] | Choice[];

interface ChoiceListFormatterOptions {
  layout: 'vertical' | 'horizontal';
}

const getDefaultOptions = (): ChoiceListFormatterOptions => {
  return {
    layout: 'vertical',
  };
};

/**
 * Formatter for displaying lists of choices
 */
export class ChoiceListFormatter extends DataFormatter {
  private readonly outputContent: string;

  constructor(
    private readonly choiceList: ChoiceListFormatterItems,
    private readonly options: ChoiceListFormatterOptions = getDefaultOptions()
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

      return `[${key}] ${title}`;
    });
  }
}
