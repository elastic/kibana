/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Logger } from 'src/core/server';
import { AlertType, AlertExecutorOptions } from '../../types';
import { ActionContext, EsQueryAlertActionContext, addMessages } from './action_context';
import {
  EsQueryAlertParams,
  EsQueryAlertParamsSchema,
  EsQueryAlertParamsSchemaProperties,
} from './alert_type_params';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import { ComparatorFns, getHumanReadableComparator, getInvalidComparatorMessage } from '../lib';
import { executeEsQuery, ExecuteEsQueryAlertParams } from './es_query';

export const ES_QUERY_ID = '.es-query';

const ActionGroupId = 'doc count threshold met';
const ConditionMetAlertInstanceId = 'matched documents';

export function getAlertType(
  logger: Logger
): AlertType<EsQueryAlertParams, {}, {}, ActionContext, typeof ActionGroupId> {
  const alertTypeName = i18n.translate('xpack.stackAlerts.esQuery.alertTypeTitle', {
    defaultMessage: 'ES query',
  });

  const actionGroupName = i18n.translate('xpack.stackAlerts.esQuery.actionGroupThresholdMetTitle', {
    defaultMessage: 'Doc count threshold met',
  });

  const actionVariableContextDateLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextDateLabel',
    {
      defaultMessage: 'The date the alert met the threshold condition.',
    }
  );

  const actionVariableContextValueLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextValueLabel',
    {
      defaultMessage: 'The value that met the threshold condition.',
    }
  );

  const actionVariableContextMessageLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextMessageLabel',
    {
      defaultMessage: 'A pre-constructed message for the alert.',
    }
  );

  const actionVariableContextTitleLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextTitleLabel',
    {
      defaultMessage: 'A pre-constructed title for the alert.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextConditionsLabel',
    {
      defaultMessage: 'A string describing the threshold condition.',
    }
  );

  const alertParamsVariables = Object.keys(EsQueryAlertParamsSchemaProperties).map(
    (propKey: string) => {
      return {
        name: propKey,
        description: propKey,
      };
    }
  );

  return {
    id: ES_QUERY_ID,
    name: alertTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    validate: {
      params: EsQueryAlertParamsSchema,
    },
    actionVariables: {
      context: [
        { name: 'message', description: actionVariableContextMessageLabel },
        { name: 'title', description: actionVariableContextTitleLabel },
        { name: 'date', description: actionVariableContextDateLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'conditions', description: actionVariableContextConditionsLabel },
      ],
      params: alertParamsVariables,
    },
    minimumLicenseRequired: 'basic',
    executor,
    producer: STACK_ALERTS_FEATURE_ID,
  };

  async function executor(
    options: AlertExecutorOptions<EsQueryAlertParams, {}, {}, ActionContext, typeof ActionGroupId>
  ) {
    const { alertId, name, services, params } = options;

    const callCluster = services.callCluster;

    logger.info('EXECUTING SEARCH ALERT');
    logger.info(JSON.stringify(params));

    // parameter validation
    const compareFn = ComparatorFns.get(params.thresholdComparator);
    if (compareFn == null) {
      throw new Error(getInvalidComparatorError(params.thresholdComparator));
    }

    const date = Date.now();

    const queryParams: ExecuteEsQueryAlertParams = {
      ...params,
      date,
    };

    const numMatchingDocs = await executeEsQuery({ logger, callCluster, query: queryParams });
    logger.info(`alert ${ES_QUERY_ID}:${alertId} "${name}" query has ${numMatchingDocs} matches`);
    logger.debug(`alert ${ES_QUERY_ID}:${alertId} "${name}" query has ${numMatchingDocs} matches`);

    // apply the alert condition
    const conditionMet = compareFn(numMatchingDocs, params.threshold);
    if (conditionMet) {
      const humanFn = `number of matching documents is ${getHumanReadableComparator(
        params.thresholdComparator
      )} ${params.threshold.join(' and ')}`;

      const baseContext: EsQueryAlertActionContext = {
        date: new Date(date).toISOString(),
        value: numMatchingDocs,
        conditions: humanFn,
      };

      const actionContext = addMessages(options, baseContext, params);
      const alertInstance = options.services.alertInstanceFactory(ConditionMetAlertInstanceId);
      alertInstance.scheduleActions(ActionGroupId, actionContext);
      logger.info(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
      logger.debug(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
    } else {
      logger.info('NO ACTIVE ALERT');
    }
  }
}

function getInvalidComparatorError(comparator: string) {
  return getInvalidComparatorMessage(
    'xpack.stackAlerts.esQuery.invalidComparatorErrorMessage',
    comparator
  );
}
