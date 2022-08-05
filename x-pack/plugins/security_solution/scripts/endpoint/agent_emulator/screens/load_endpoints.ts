/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  protected header() {
    return super.header(TOOL_TITLE, 'Endpoint loader');
  }

  protected body(): string | DataFormatter {
    if (this.runInfo) {
      return this.loadingView();
    }

    return this.promptView();
  }

  protected onEnterChoice(choice: string) {
    switch (choice.toUpperCase()) {
      case 'Q':
        this.hide();
        return;

      default:
        const count: number = Number(choice);

        if (!Number.isFinite(count)) {
          throw new Error(`Invalid number: ${choice}`);
        }

        this.runInfo = {
          count,
          progress: new ProgressFormatter(),
          isRunning: false,
          isDone: false,
        };

        this.show();
        this.loadEndpoints();
    }
  }

  private async loadEndpoints() {
    await new Promise((r) => setTimeout(r, 2000));
    this.runInfo?.progress.setProgress(20);
    this.show();

    await new Promise((r) => setTimeout(r, 2000));
    this.runInfo?.progress.setProgress(40);
    this.show();

    await new Promise((r) => setTimeout(r, 2000));
    this.runInfo?.progress.setProgress(80);
    this.show();

    await new Promise((r) => setTimeout(r, 2000));
    this.runInfo?.progress.setProgress(100);
    this.show();
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
  ${this.runInfo.progress.output}
`;
    }

    return 'Unknown state';
  }
}
