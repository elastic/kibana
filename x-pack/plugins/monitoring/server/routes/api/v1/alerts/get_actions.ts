/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionResult } from '../../../../../../actions/common';
// @ts-ignore
import { handleError } from '../../../../lib/errors';
import { RouteDependencies } from '../../../../types';
import { AlertsFactory } from '../../../../alerts';
import { CommonActionDefaultParameters } from '../../../../../common/types';

export function getActionsRoute(server: any, npRoute: RouteDependencies) {
  npRoute.router.get(
    {
      path: '/api/monitoring/v1/alert/actions',
      options: { tags: ['access:monitoring'] },
      validate: false,
    },
    async (context, request, response) => {
      try {
        let actions: ActionResult[] = [];
        const types = context.actions?.listTypes();
        const actionsClient = context.actions?.getActionsClient();
        if (actionsClient) {
          actions = (await actionsClient.getAll()) as ActionResult[];
        }

        const defaultParametersByAlertType: CommonActionDefaultParameters = {};
        const allAlerts = await AlertsFactory.getAll();
        for (const alert of allAlerts) {
          const list: { [id: string]: any } = {};
          if (types) {
            for (const type of types) {
              list[type.id] = alert.getDefaultActionParams(type.id);
            }
          }
          defaultParametersByAlertType[alert.type] = list;
        }
        return response.ok({ body: { types, actions, defaultParametersByAlertType } });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
