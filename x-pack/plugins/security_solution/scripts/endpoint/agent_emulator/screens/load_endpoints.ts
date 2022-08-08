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
import { ScreenBaseClass } from '../../common/screen';
import { TOOL_TITLE } from '../constants';

interface LoadOptions {
  count: number;
  progress: ProgressFormatter;
  isRunning: boolean;
  isDone: boolean;
}

export class LoadEndpointsScreen extends ScreenBaseClass {
  private runInfo: LoadOptions | undefined = undefined;

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

    return this.promptView();
  }

  protected onEnterChoice(choice: string) {
    const choiceValue = choice.trim().toUpperCase();

    if (choiceValue === 'Q') {
      this.hide();
      return;
    }

    if (!choiceValue) {
      if (this.runInfo?.isDone) {
        this.runInfo = undefined;
        this.reRender();
        return;
      }

      this.throwUnknownChoiceError(choice);
    }

    const count: number = Number(choiceValue);

    if (!Number.isFinite(count)) {
      throw new Error(`Invalid number: ${choice}`);
    }

    this.runInfo = {
      count,
      progress: new ProgressFormatter(),
      isRunning: false,
      isDone: false,
    };

    this.reRender();
    this.loadEndpoints();
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

  private promptView(): string | DataFormatter {
    return `

  How many endpoints to load?
  `;
  }

  private loadingView(): string | DataFormatter {
    if (this.runInfo) {
      return `

  Creating ${this.runInfo.count} endpoint(s):

  ${this.runInfo.progress.output}`;
    }

    return 'Unknown state';
  }

  private doneView(): string {
    return `${this.loadingView()}

  Done. Endpoint(s) have been loaded into Elastic/Kibana.
  Press Enter to continue`;
  }
}
