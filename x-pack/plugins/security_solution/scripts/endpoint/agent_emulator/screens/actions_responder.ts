/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOOL_TITLE } from '../constants';
import type { EmulatorRunContext } from '../services/emulator_run_context';
import type { DataFormatter } from '../../common/screen';
import { ScreenBaseClass } from '../../common/screen';

export class ActionResponderScreen extends ScreenBaseClass {
  constructor(private readonly emulatorContext: EmulatorRunContext) {
    super();
  }

  protected header() {
    return super.header(TOOL_TITLE, 'Actions Responder');
  }

  protected body(): string | DataFormatter {
    return `Service checks for new Endpoint Actions and automatically responds to them.
  The following tokens can be used in the Action request 'comment' to drive
  the type of response that is sent:
  Token                         Description
  ---------------------------   -------------------------------------------------------
  RESPOND.STATE=SUCCESS         Will ensure the Endpoint Action response is success
  RESPOND.STATE=FAILURE         Will ensure the Endpoint Action response is a failure
  RESPOND.FLEET.STATE=SUCCESS   Will ensure the Fleet Action response is success
  RESPOND.FLEET.STATE=FAILURE   Will ensure the Fleet Action response is a failure

`;
  }

  protected onEnterChoice(choice: string) {
    const choiceValue = choice.trim().toUpperCase();

    switch (choiceValue) {
      case 'Q':
        this.hide();
    }
  }
}
