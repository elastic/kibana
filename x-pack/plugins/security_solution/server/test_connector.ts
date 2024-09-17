/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { get, set, omit } from 'lodash';
import { flatten } from 'flat';

import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  SecurityConnectorFeatureId,
  UptimeConnectorFeatureId,
} from '@kbn/actions-plugin/common/connector_feature_config';
import type { ConnectorAdapter } from '@kbn/alerting-plugin/server';

import { DEFAULT_ALERTS_INDEX } from '../common/constants';


export type ServerLogConnectorType = ConnectorType<{}, {}, ActionParamsType>;
export type ServerLogConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  {},
  {},
  ActionParamsType
>;

// params definition

export type ActionParamsType = TypeOf<
  typeof ParamsSchema & {
    alerts: any;
  }
>;

const ParamsSchema = schema.object({
  subAction: schema.string(),
  alerts: schema.any(),
});

export const ConnectorTypeId = '.workflow-connector';

// connector type definition
export function getConnectorType(): ServerLogConnectorType {
  return {
    id: ConnectorTypeId,
    isSystemActionType: true,
    minimumLicenseRequired: 'gold', // Third party action types require at least gold
    name: i18n.translate('xpack.stackConnectors.systemLogExample.title', {
      defaultMessage: 'Workflow connector',
    }),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      params: {
        schema: ParamsSchema,
      },
    },
    executor,
  };
}

export const connectorAdapter: ConnectorAdapter<{ alerts: any }, { alerts: any }> = {
  connectorTypeId: ConnectorTypeId,
  ruleActionParamsSchema: ParamsSchema,
  buildActionParams: ({ alerts, rule, params, spaceId, ruleUrl }) => {
    return {
      ...params,
      alerts,
    };
  },
};

// action executor

const actions = [
  {
    name: 'ENRICH',
    config: {
      index: '.threat-indicators',
      alertField: 'host.name',
      fromIndexField: 'threat.host.name',
      enrichFields: [
        {
          from: 'threat.host.name',
          to: 'threat.indicator.name',
        },
      ],
    },
    next: {
      name: 'CONDITION',
      config: {
        conditions: {
          condition: {
            type: 'EXIST',
            field: 'threat.indicator.name',
          },
          trueBranch: {
            name: 'CONDITION',
            config: {
              conditions: {
                condition: {
                  type: 'MORE',
                  field: 'user.risk.calculated_score_norm',
                  value: 60,
                },
                trueBranch: {
                  name: 'ASSIGN',
                  config: {
                    assignTo: 'u_IYwQMezBfzO5yhCcsSCvC0sp47Y7rDwVH6Oz5Ucu0CU_0',
                  },
                },
              },
            },
          },
          falseBranch: {
            name: 'CLOSE',
          },
        },
      },
    },
  },
];

const processAlerts = async (alerts, actions, services) => {
  return await processAction(alerts, actions[0], services);
};

const processAction = async (alerts, action, services) => {
  let nextAction = action;
  let newAlerts = alerts;
  while (nextAction) {
    switch (nextAction.name) {
      case 'ENRICH':
        newAlerts = await enrichAlerts(newAlerts, nextAction.config, services);
        break;
      case 'CONDITION':
        newAlerts = await conditionAlerts(newAlerts, nextAction.config, services);
        break;
      case 'ASSIGN':
        newAlerts = await assignAlerts(newAlerts, nextAction.config, services);
        break;
      case 'CLOSE':
        newAlerts = await closeAlerts(newAlerts, nextAction.config, services);
        break;
      default:
        break;
    }

    nextAction = nextAction.next;
  }
  return newAlerts;
};

const enrichAlerts = async (alerts, config, services) => {
  const esClient = services.scopedClusterClient;
  const values = alerts.map((alert) => get(alert, config.alertField));
  const enrichDocs = await esClient.search({
    index: config.fromIndex,
    body: {
      query: {
        terms: {
          [config.fromIndexField]: values,
        },
      },
    },
  });

  const newAlerts = alerts.map((alert) => {
    if (enrichDocs.hits.hits.length > 0) {
      const enrichDoc = enrichDocs.hits.hits.find(
        (doc) => get(doc._source, config.fromIndexField) === get(alert, config.alertField)
      );
      if (enrichDoc) {
        const copiedAlert = { ...alert };
        config.enrichFields.forEach((fieldMap) => {
          set(copiedAlert, fieldMap.to, get(enrichDoc._source, fieldMap.from));
        });

        return copiedAlert;
      }
    }
    return alert;
  });

  return newAlerts;
};

const conditionAlerts = async (alerts, config, services) => {
  const { condition, trueBranch, falseBranch } = config.conditions;

  const trueBranchAlerts = [];
  const falseBranchAlerts = [];

  for (const alert of alerts) {
    const conditionMet = evaluateCondition(alert, condition);
    if (conditionMet) {
      trueBranchAlerts.push(alert);
    } else {
      falseBranchAlerts.push(alert);
    }
  }

  const processedTrueBranch = trueBranch
    ? await processAction(trueBranchAlerts, trueBranch, services)
    : [];
  const processedFalseBranch = falseBranch
    ? await processAction(falseBranchAlerts, falseBranch, services)
    : [];

  return [...processedTrueBranch, ...processedFalseBranch];
};

const assignAlerts = async (alerts, config) => {
  return alerts.map((alert) => {
    const updatedAlert = { ...alert }; 
    updatedAlert['kibana.alert.workflow_assignee_ids'] = config.assignTo;
    return updatedAlert;
  });
};

const closeAlerts = async (alerts) => {
  return alerts.map((alert) => {
    const updatedAlert = { ...alert }; 
    updatedAlert['kibana.alert.workflow_status'] = 'closed';
    return updatedAlert;
  });
};

const evaluateCondition = (alert, condition) => {
  const { type, field } = condition;

  if (type === 'EXIST') {
    return get(alert, field) !== undefined;
  } else if (type === 'MORE') {
    return get(alert, field) > condition.value;
  }
  return false;
};

async function executor(
  execOptions: ServerLogConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<void>> {
  const { actionId, params, logger } = execOptions;
  try {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await wait(15000);
    const newAlerts = params?.alerts?.all?.data;

    const processedAlerts = await processAlerts(newAlerts, actions, execOptions.services);
    const esClient = execOptions.services.scopedClusterClient;

    const bulkOps = [];

    processedAlerts.forEach((doc) => {
      bulkOps.push(
        { update: { _index: `${DEFAULT_ALERTS_INDEX}-default`, _id: doc._id } },
        {
          doc: {
            ...flatten(omit(doc, ['_index', '_id', 'signal', 'kibana', 'event'])),
          },
        }
      );
    });

    // Execute the bulk update
    const response = await esClient.bulk({ refresh: true, body: bulkOps });
  } catch (err) {
    const message = 'error';
    return {
      status: 'error',
      message,
      serviceMessage: err.message,
      actionId,
    };
  }

  params?.onComplete?.();
  return { status: 'ok', actionId };
}
