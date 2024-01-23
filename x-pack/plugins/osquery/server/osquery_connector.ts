/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { LogMeta } from '@kbn/core/server';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common/connector_feature_config';
import type { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import { osqueryResponseAction } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_response_actions/osquery_response_action';

export type ServerLogConnectorType = ConnectorType<{}, {}, ActionParamsType>;
export type ServerLogConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  {},
  {},
  ActionParamsType
>;

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object(
  {
    // message: schema.string(),
  },
  { unknowns: 'allow' }
);

export const ConnectorTypeId = '.osquery';
// connector type definition
export function getConnectorType({ createActionService }): ServerLogConnectorType {
  return {
    id: ConnectorTypeId,
    isSystemActionType: true,
    minimumLicenseRequired: 'gold', // Third party action types require at least gold
    name: i18n.translate('xpack.stackConnectors.systemLogExample.title', {
      defaultMessage: 'Osquery',
    }),
    supportedFeatureIds: [AlertingConnectorFeatureId, SecurityConnectorFeatureId],
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      params: {
        schema: ParamsSchema,
      },
    },
    executor: curry(executor)({
      createActionService,
    }),
  };
}

export const connectorAdapter: ConnectorAdapter = {
  connectorTypeId: ConnectorTypeId,
  ruleActionParamsSchema: ParamsSchema,
  buildActionParams: ({ alerts, rule, params, spaceId, ruleUrl }) => ({
    alerts: alerts.all.data,
    ...params,
  }),
};

// action executor

async function executor(
  { createActionService },
  execOptions: ServerLogConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<void>> {
  const { actionId, params, logger, actionsClient } = execOptions;

  logger.info('EXECOPTIONS', Object.keys(execOptions));
  logger.info('EXECOPTIONS PARAMS', params);

  logger.info('actionsClient test2', Object.getOwnPropertyNames(actionsClient));

  logger.info('dupa', await actionsClient.getAll({ includeSystemActions: true }));

  try {
    osqueryResponseAction(
      { actionTypeId: '.osquery', params: params.action },
      createActionService,
      { alerts: params.alerts }
    );
    logger.info<LogMeta>(`SYSTEM ACTION EXAMPLE Osquery`);
  } catch (err) {
    const message = i18n.translate('xpack.stackConnectors.serverLog.errorLoggingErrorMessage', {
      defaultMessage: 'error logging message',
    });

    return {
      status: 'error',
      message,
      serviceMessage: err.message,
      actionId,
    };
  }

  return { status: 'ok', actionId };
}
