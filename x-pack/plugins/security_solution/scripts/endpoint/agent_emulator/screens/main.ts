/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HORIZONTAL_LINE } from '../../common/constants';
import { ScreenBaseClass } from './screen_base_class';

export class MainScreen extends ScreenBaseClass {
  protected header(): string {
    return `${HORIZONTAL_LINE}
 Endpoint Agent Emulator
${HORIZONTAL_LINE}
`;
  }

  protected screen(): string {
    return `
  [1] load endpoints
`;
  }

  protected onEnterChoice(choice: string) {
    global.console.log(`entered: ${choice}`);
  }
}
