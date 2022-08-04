/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LoadEndpointsScreen } from './load_endpoints';
import { TOOL_TITLE } from '../constants';
import { ChoiceListFormatter } from './lib/choice_list_formatter';
import type { DataFormatter } from './lib/data_formatter';
import { ScreenBaseClass } from './lib/screen_base_class';

export class MainScreen extends ScreenBaseClass {
  protected header(title: string = '', subTitle: string = ''): string | DataFormatter {
    return super.header(TOOL_TITLE);
  }

  protected body(): string | DataFormatter {
    return new ChoiceListFormatter(['Load endpoints']);
  }

  protected footer(): string | DataFormatter {
    return super.footer([
      {
        key: 'E',
        title: 'Exit',
      },
    ]);
  }

  protected onEnterChoice(choice: string) {
    switch (choice.toUpperCase().trim()) {
      // Load endpoints
      case '1':
        new LoadEndpointsScreen().show().then(() => {
          this.show();
        });
        return;

      case 'E':
        this.hide();
        return;
    }

    this.throwUnknownChoiceError(choice);
  }
}
