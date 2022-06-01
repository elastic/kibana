/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry, uniq } from 'lodash';
import { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { i18n } from '@kbn/i18n';
import { createActionHandler } from './create_action_handler';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

interface IAlert {
  agent?: {
    id: string;
  };
}

export const getOsqueryActionType = (osqueryContext: OsqueryAppContext) => ({
  id: '.osquery',
  name: 'Osquery',
  minimumLicenseRequired: 'gold' as const,
  // validate: {
  //   params: ParamsSchema,
  // },
  iconClass: 'logoOsquery',
  selectMessage: i18n.translate(
    'xpack.triggersActionsUI.components.builtinActionTypes.exampleAction.selectMessageText',
    {
      defaultMessage: 'Example Action is used to show how to create new action type UI.',
    }
  ),
  actionTypeTitle: i18n.translate(
    'xpack.triggersActionsUI.components.builtinActionTypes.exampleAction.actionTypeTitle',
    {
      defaultMessage: 'Example Action',
    }
  ),
  executor: curry(executor)({
    osqueryContext,
  }),
});

// @ts-expect-error update types
async function executor(payload, execOptions): Promise<ActionTypeExecutorResult<unknown>> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { query, ecs_mapping, alerts } = execOptions.params.message;
  const parsedAlerts: IAlert[] = JSON.parse(alerts);

  const agentIds = uniq(parsedAlerts.map((alert) => alert.agent?.id));

  const [coreStartServices] = await payload.osqueryContext.getStartServices();

  const esClientInternal = coreStartServices.elasticsearch.client.asInternalUser;

  const response = await createActionHandler(
    esClientInternal,
    execOptions.services.savedObjectsClient,
    {
      agents: agentIds,
      query: {
        query,
        ecs_mapping,
      },
    }
  );

  return { status: 'ok', data: response, actionId: execOptions.actionId };
}
