/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Logger } from 'src/core/server';
import { SearchResponse } from 'elasticsearch';
import { AlertType, AlertExecutorOptions } from '../../types';
import { ActionContext, EsQueryAlertActionContext, addMessages } from './action_context';
import {
  EsQueryAlertParams,
  EsQueryAlertParamsSchema,
  EsQueryAlertParamsSchemaProperties,
  EsQueryAlertState,
} from './alert_type_params';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import { ComparatorFns, getHumanReadableComparator, getInvalidComparatorMessage } from '../lib';
import {
  searchAfter,
  searchAfterCount,
  ExecuteEsQueryAlertParams,
  HandleSearchAfterResultsResponse,
} from './search_after';

export const ES_QUERY_ID = '.es-query';

const ActionGroupId = 'matched query';
const ConditionMetAlertInstanceId = 'matched query';

export function getAlertType(
  logger: Logger
): AlertType<EsQueryAlertParams, EsQueryAlertState, {}, ActionContext, typeof ActionGroupId> {
  const alertTypeName = i18n.translate('xpack.stackAlerts.esQuery.alertTypeTitle', {
    defaultMessage: 'ES query',
  });

  const actionGroupName = i18n.translate('xpack.stackAlerts.esQuery.actionGroupThresholdMetTitle', {
    defaultMessage: 'Matched query',
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
    options: AlertExecutorOptions<
      EsQueryAlertParams,
      EsQueryAlertState,
      {},
      ActionContext,
      typeof ActionGroupId
    >
  ) {
    const { alertId, name, services, params, state } = options;
    const sortId = state.sortId;

    const callCluster = services.callCluster;
    const buildLogMessage = (({ id, alertName }: { alertName: string; id: string }) => (
      ...messages: string[]
    ) => [...messages, `name: "${alertName}"`, `id: "${id}"`].join(' '))({
      id: alertId,
      alertName: name,
    });
    // parameter validation
    const compareFn = params.thresholdComparator
      ? ComparatorFns.get(params.thresholdComparator)
      : null;
    if (params.thresholdComparator && compareFn == null) {
      throw new Error(getInvalidComparatorError(params.thresholdComparator));
    }

    // determine what type of alert:
    // - if threshold and thresholdComparator exists, we will see if the number of
    // unique query matches meets the threshold condition. if it does, this will generate
    // a single alert instance
    //
    // - if threshold and thresholdComparator are not defined exist, alert will generate
    // an alert instance for each matching document
    const thresholdAlert: boolean = !!params.threshold && !!params.thresholdComparator;

    const handleSearchAfterResults = (
      searchResult: SearchResponse<unknown>
    ): HandleSearchAfterResultsResponse => {
      logger.info(
        `alert ${ES_QUERY_ID}:${alertId} "${name}" query has ${searchResult.hits.hits.length} alert instances`
      );

      searchResult.hits.hits.forEach((hit) => {
        // doc id as instance id
        const instanceId = hit._id;
        const baseContext: EsQueryAlertActionContext = {
          date: new Date(date).toISOString(),
          conditions: `document with id '${instanceId}' matched query "${params.esQuery}"`,
        };

        const actionContext = addMessages(options, baseContext, params);
        const alertInstance = options.services.alertInstanceFactory(instanceId);
        alertInstance.scheduleActions(ActionGroupId, actionContext);
        // logger.info(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
        logger.debug(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
      });

      if (searchResult._shards.failed !== 0) {
        logger.warn(
          `alert ${ES_QUERY_ID}:${alertId} "${name}" had shard failures during alert execution - some alert instances may be missing.`
        );
      }

      return {
        numResultsHandled: searchResult.hits.hits.length,
        advanceSortId: true,
      };
    };

    const handleSearchAfterCountResults = (
      searchResult: SearchResponse<unknown>
    ): HandleSearchAfterResultsResponse => {
      let numResultsHandled: number = 0;

      const numMatches = searchResult.hits.total;
      logger.info(`alert ${ES_QUERY_ID}:${alertId} "${name}" query has ${numMatches} matches`);
      logger.debug(`alert ${ES_QUERY_ID}:${alertId} "${name}" query has ${numMatches} matches`);

      // apply the alert condition
      const conditionMet = !!(
        compareFn &&
        params.threshold &&
        compareFn(numMatches, params.threshold)
      );

      if (conditionMet) {
        numResultsHandled += numMatches;
        const humanFn = `number of matching documents is ${getHumanReadableComparator(
          params.thresholdComparator!
        )} ${params.threshold!.join(' and ')}`;

        const baseContext: EsQueryAlertActionContext = {
          date: new Date(date).toISOString(),
          value: numMatches,
          conditions: humanFn,
        };

        const actionContext = addMessages(options, baseContext, params);
        const alertInstance = options.services.alertInstanceFactory(ConditionMetAlertInstanceId);
        alertInstance.scheduleActions(ActionGroupId, actionContext);
        logger.info(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
        logger.debug(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
      } else {
        logger.info('ALERT CONDITION NOT MATCHED');
      }

      return {
        numResultsHandled,
        advanceSortId: conditionMet,
      };
    };

    logger.info('EXECUTING SEARCH ALERT');
    logger.info(JSON.stringify(params));

    const date = Date.now();

    const queryParams: ExecuteEsQueryAlertParams = {
      ...params,
      date,
    };

    const lastSortId = thresholdAlert
      ? await searchAfterCount({
          logger,
          callCluster,
          previousSortId: sortId,
          query: queryParams,
          buildLogMessage,
          handleSearchAfterResults: handleSearchAfterCountResults,
        })
      : await searchAfter({
          logger,
          callCluster,
          previousSortId: sortId,
          query: queryParams,
          buildLogMessage,
          handleSearchAfterResults,
        });

    return {
      sortId: lastSortId,
    };
  }
}

function getInvalidComparatorError(comparator: string) {
  return getInvalidComparatorMessage(
    'xpack.stackAlerts.esQuery.invalidComparatorErrorMessage',
    comparator
  );
}
