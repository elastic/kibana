/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable require-atomic-updates */

import { loadEndpoints } from '../services/endpoint_loader';
import type { EmulatorRunContext } from '../services/emulator_run_context';
import { ProgressFormatter } from '../../common/screen/progress_formatter';
import type { DataFormatter } from '../../common/screen';
import { ChoiceMenuFormatter, ScreenBaseClass } from '../../common/screen';
import { TOOL_TITLE } from '../constants';

interface LoadOptions {
  count: number;
  progress: ProgressFormatter;
  isRunning: boolean;
  isDone: boolean;
}

export class LoadEndpointsScreen extends ScreenBaseClass {
  private runInfo: LoadOptions | undefined = undefined;
  private choices: ChoiceMenuFormatter = new ChoiceMenuFormatter([
    {
      title: 'Load',
      key: '1',
    },
    {
      title: 'Configure',
      key: '2',
    },
  ]);

  constructor(private readonly emulatorContext: EmulatorRunContext) {
    super();
  }

  protected header() {
    return super.header(TOOL_TITLE, 'Endpoint loader');
  }

  protected body(): string | DataFormatter {
    if (this.runInfo) {
      if (this.runInfo.isDone) {
        return this.doneView();
      }

      return this.loadingView();
    }

    return this.mainView();
  }

  protected onEnterChoice(choice: string) {
    const choiceValue = choice.trim().toUpperCase();

    switch (choiceValue) {
      case 'Q':
        this.hide();
        return;

      case '1':
        this.runInfo = {
          count: 2,
          progress: new ProgressFormatter(),
          isRunning: false,
          isDone: false,
        };

        this.reRender();
        this.loadEndpoints();
        return;

      case '2':
        // show config
        return;

      default:
        if (!choiceValue) {
          if (this.runInfo?.isDone) {
            this.runInfo = undefined;
            this.reRender();
            return;
          }

          this.throwUnknownChoiceError(choice);
        }
    }

    //
    // const count: number = Number(choiceValue);

    // if (!Number.isFinite(count)) {
    //   throw new Error(`Invalid number: ${choice}`);
    // }
  }

  private async loadEndpoints() {
    const runInfo = this.runInfo;

    if (runInfo && !runInfo.isDone && !runInfo.isRunning) {
      runInfo.isRunning = true;

      await loadEndpoints(
        runInfo.count,
        this.emulatorContext.getEsClient(),
        this.emulatorContext.getKbnClient(),
        this.emulatorContext.getLogger(),
        (progress) => {
          runInfo.progress.setProgress(progress.percent);
          this.reRender();
        }
      );

      runInfo.isDone = true;
      runInfo.isRunning = false;
      this.reRender();
    }
  }

  private mainView(): string | DataFormatter {
    return `
  Generate and load endpoints into elasticsearch along with associated
  fleet agents. Current settings:

      Count: ${this.runInfo?.count ?? 2}

  Options:

  ${this.choices.output}`;
  }

  private loadingView(): string | DataFormatter {
    if (this.runInfo) {
      return `

  Creating ${this.runInfo.count} endpoint(s):

  ${this.runInfo.progress.output}
`;
    }

    return 'Unknown state';
  }

  private doneView(): string {
    return `${this.loadingView()}

  Done. Endpoint(s) have been loaded into Elastic/Kibana.
  Press Enter to continue
`;
  }
}
