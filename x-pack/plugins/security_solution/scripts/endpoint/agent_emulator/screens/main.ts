/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LoadEndpointsScreen } from './load_endpoints';
import { TOOL_TITLE } from '../constants';
import { ScreenBaseClass, ChoiceListFormatter } from '../../common/screen';
import type { DataFormatter } from '../../common/screen/data_formatter';

export class MainScreen extends ScreenBaseClass {
  private readonly loadEndpointsScreen = new LoadEndpointsScreen();

  protected header(title: string = '', subTitle: string = ''): string | DataFormatter {
    return super.header(TOOL_TITLE);
  }

  protected body(): string | DataFormatter {
    return `

${new ChoiceListFormatter(['Load endpoints']).output}\n`;
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
        this.pause();
        this.loadEndpointsScreen.show({ resume: true }).then(() => {
          this.show({ resume: true });
        });
        return;

      case 'E':
        this.hide();
        return;
    }

    this.throwUnknownChoiceError(choice);
  }
}
