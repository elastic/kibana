/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionResponderScreen } from './actions_responder';
import { SCREEN_ROW_MAX_WIDTH } from '../../common/screen/constants';
import { ColumnLayoutFormatter } from '../../common/screen/column_layout_formatter';
import type { EmulatorRunContext } from '../services/emulator_run_context';
import { LoadEndpointsScreen } from './load_endpoints';
import { TOOL_TITLE } from '../constants';
import { ScreenBaseClass, ChoiceMenuFormatter } from '../../common/screen';
import type { DataFormatter } from '../../common/screen/data_formatter';
import { RunServiceStatus } from './components/run_service_status_formatter';

export class MainScreen extends ScreenBaseClass {
  private readonly loadEndpointsScreen: LoadEndpointsScreen;
  private readonly actionsResponderScreen: ActionResponderScreen;

  private actionColumnWidthPrc = 30;
  private runningStateColumnWidthPrc = 70;

  constructor(private readonly emulatorContext: EmulatorRunContext) {
    super();
    this.loadEndpointsScreen = new LoadEndpointsScreen(this.emulatorContext);
    this.actionsResponderScreen = new ActionResponderScreen(this.emulatorContext);
  }

  protected header(title: string = '', subTitle: string = ''): string | DataFormatter {
    return super.header(TOOL_TITLE);
  }

  protected body(): string | DataFormatter {
    return `\n${
      new ColumnLayoutFormatter([this.getMenuOptions(), this.runStateView()], {
        widths: [this.actionColumnWidthPrc, this.runningStateColumnWidthPrc],
      }).output
    }`;
  }

  private getMenuOptions(): ChoiceMenuFormatter {
    return new ChoiceMenuFormatter(['Load endpoints', 'Actions Responder']);
  }

  private runStateView(): ColumnLayoutFormatter {
    const context = this.emulatorContext;

    return new ColumnLayoutFormatter(
      [
        ['Agent Keep Alive Service', 'Actions Responder Service'].join('\n'),
        [
          new RunServiceStatus(context.getAgentKeepAliveService()).output,
          new RunServiceStatus(context.getActionResponderService()).output,
        ].join('\n'),
      ],
      {
        rowLength: Math.floor(SCREEN_ROW_MAX_WIDTH * (this.runningStateColumnWidthPrc / 100)),
        separator: ': ',
        widths: [70, 30],
      }
    );
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

      case '2':
        this.pause();
        this.actionsResponderScreen.show({ resume: true }).then(() => {
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
