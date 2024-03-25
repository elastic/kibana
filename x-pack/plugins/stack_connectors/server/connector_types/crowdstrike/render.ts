/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash';
import { set } from '@kbn/safer-lodash-set/fp';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { ExecutorParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { Logger } from '@kbn/core/server';
import { SUB_ACTION } from '../../../common/crowdstrike/constants';

interface Context {
  alerts: Ecs[];
}

export const renderParameterTemplates = (
  logger: Logger,
  params: ExecutorParams,
  variables: Record<string, unknown>
) => {
  const context = variables?.context as Context;
  const alertIds = map(context.alerts, '_id');

  // TODO TC: DOUBLE CHECK IF WE NEED THIS
  if (params?.subAction === SUB_ACTION.HOST_ACTIONS) {
    return {
      subAction: SUB_ACTION.HOST_ACTIONS,
      subActionParams: {
        host: context.alerts[0].host?.name,
        alertIds,
        ...params.subActionParams,
      },
    };
  }

  let body: string;
  try {
    let bodyObject;
    const alerts = context.alerts;
    if (alerts) {
      // Remove the "kibana" entry from all alerts to reduce weight, the same data can be found in other parts of the alert object.
      bodyObject = set(
        'context.alerts',
        alerts.map(({ kibana, ...alert }) => alert),
        variables
      );
    } else {
      bodyObject = variables;
    }
    body = JSON.stringify(bodyObject);
  } catch (err) {
    body = JSON.stringify({ error: { message: err.message } });
  }
  return set('subActionParams.body', body, params);
};
