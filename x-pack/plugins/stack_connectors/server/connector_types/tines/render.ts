/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set/fp';
import { ExecutorParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { RenderParameterTemplates } from '@kbn/actions-plugin/server/types';
import { SUB_ACTION } from '../../../common/tines/constants';

interface Context {
  alerts: Array<Record<string, unknown>>;
}

export const renderParameterTemplates: RenderParameterTemplates<ExecutorParams> = (
  logger,
  params,
  variables
) => {
  if (params?.subAction !== SUB_ACTION.RUN) return params;

  let body: string;
  try {
    let bodyObject;
    const alerts = (variables?.context as Context)?.alerts;
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
