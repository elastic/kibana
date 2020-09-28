/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import {
  UiActionsActionDefinition,
  UiActionsActionDefinitionContext as ActionDefinitionContext,
} from '../../../../../src/plugins/ui_actions/public';
import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';
import { StartDependencies } from '../plugin';
import { StartServicesGetter } from '../../../../../src/plugins/kibana_utils/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { ActionsConnectorsContextProvider, ActionForm } from '../../../triggers_actions_ui/public';

interface Context {
  embeddable: IEmbeddable;
}

export const SEND_TO_SLACK = 'SEND_TO_SLACK';

export interface SendToSlackActionParams {
  start: StartServicesGetter<Pick<StartDependencies, 'triggers_actions_ui'>>;
}

export class SendToSlackAction implements UiActionsActionDefinition<Context> {
  public readonly id = SEND_TO_SLACK;
  public readonly order = 24;

  public readonly getDisplayName = () => 'Send to Slack';
  public readonly getIconType = () => 'logoSlack';

  constructor(private readonly params: SendToSlackActionParams) {}

  public readonly isCompatible = async (
    context: ActionDefinitionContext<Context>
  ): Promise<boolean> => {
    return true;
  };

  public readonly execute = async (context: ActionDefinitionContext<Context>): Promise<void> => {
    const { core, plugins } = this.params.start();

    const handle = core.overlays.openFlyout(
      toMountPoint(
        <ActionsConnectorsContextProvider
          value={{
            http: core.http,
            toastNotifications: core.notifications.toasts,
            actionTypeRegistry: plugins.triggers_actions_ui.actionTypeRegistry,
            capabilities: core.application.capabilities,
            docLinks: core.docLinks,
          }}
        >
          {/* <ActionForm
            actions: AlertAction[];
            defaultActionGroupId: string;
            setActionIdByIndex: (id: string, index: number) => void;
            setAlertProperty: (actions: AlertAction[]) => void;
            setActionParamsProperty: (key: string, value: any, index: number) => void;
            http: HttpSetup;
            actionTypeRegistry: TypeRegistry<ActionTypeModel>;
            toastNotifications: Pick<
              ToastsApi,
              'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
            >;
            docLinks: DocLinksStart;
            actionTypes?: ActionType[];
            messageVariables?: ActionVariable[];
            defaultActionMessage?: string;
            setHasActionsDisabled?: (value: boolean) => void;
            capabilities: ApplicationStart['capabilities'];
          /> */}
        </ActionsConnectorsContextProvider>
      ),
      {
        ownFocus: true,
      }
    );
  };
}
