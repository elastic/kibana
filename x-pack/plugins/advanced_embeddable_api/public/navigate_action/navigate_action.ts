/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExecuteActionContext } from '../../../../../src/legacy/core_plugins/embeddable_api/public';

// @ts-ignore
// @ts-ignore
import { interpretAst } from '../../interpreter/public/interpreter';
import { NAVIGATE_ACTION_TYPE } from './navigate_action_factory';
import { DynamicAction, ActionSavedObject } from '../dynamic_actions';

export class NavigateAction extends DynamicAction {
  public urlTemplate: string = '';

  constructor(actionSavedObject?: ActionSavedObject) {
    super({
      actionSavedObject,
      type: NAVIGATE_ACTION_TYPE,
    });

    if (actionSavedObject && actionSavedObject.attributes.configuration !== '') {
      this.urlTemplate = actionSavedObject.attributes.configuration;
    }
  }

  public updateConfiguration(config: string) {
    this.urlTemplate = config;
  }

  public getConfiguration() {
    return this.urlTemplate;
  }

  public execute({ embeddable, triggerContext }: ExecuteActionContext) {
    const url = this.injectTemplateParameters(this.urlTemplate, embeddable, triggerContext);
    window.open(url, '_blank');
  }
}
