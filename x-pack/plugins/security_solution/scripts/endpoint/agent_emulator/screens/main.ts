/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChoiceListFormatter } from './lib/choice_list_formatter';
import type { DataFormatter } from './lib/data_formatter';
import { HORIZONTAL_LINE } from '../../common/constants';
import { ScreenBaseClass } from './lib/screen_base_class';

export class MainScreen extends ScreenBaseClass {
  protected header(): string {
    return `${HORIZONTAL_LINE}
 Endpoint Agent Emulator
${HORIZONTAL_LINE}`;
  }

  protected body(): string | DataFormatter {
    return new ChoiceListFormatter(['Load endpoints']);
  }

  protected onEnterChoice(choice: string) {
    switch (choice.toUpperCase().trim()) {
      // Load endpoints
      case '1':
        return;

      case 'Q':
        this.hide();
        return;
    }

    throw new Error(`Unknown choice: ${choice}`);
  }
}
