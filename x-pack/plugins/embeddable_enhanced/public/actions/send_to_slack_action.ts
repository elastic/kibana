/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UiActionsActionDefinition,
  UiActionsActionDefinitionContext as ActionDefinitionContext,
} from '../../../../../src/plugins/ui_actions/public';
import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';

interface Context {
  embeddable: IEmbeddable;
}

export const SEND_TO_SLACK = 'SEND_TO_SLACK';

export class SendToSlackAction implements UiActionsActionDefinition<Context> {
  public readonly id = SEND_TO_SLACK;
  public readonly order = 24;

  public readonly getDisplayName = () => 'Send to Slack';
  public readonly getIconType = () => 'logoSlack';

  public readonly isCompatible = async (
    context: ActionDefinitionContext<Context>
  ): Promise<boolean> => {
    return true;
  };

  public readonly execute = async (context: ActionDefinitionContext<Context>): Promise<void> => {
    alert('Sending to slack');
  };
}
