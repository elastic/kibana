/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataFormatter } from '../../common/screen';
import { ScreenBaseClass } from '../../common/screen';
import { TOOL_TITLE } from '../constants';

export class LoadEndpointsScreen extends ScreenBaseClass {
  protected header() {
    return super.header(TOOL_TITLE, 'Endpoint loader');
  }

  protected body(): string | DataFormatter {
    return super.body();
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
    }

    this.throwUnknownChoiceError(choice);
  }

  private async loadEndpoints(count: number) {
    //
  }
}
