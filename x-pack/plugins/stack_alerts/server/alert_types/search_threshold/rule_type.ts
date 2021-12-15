/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Logger } from 'src/core/server';
import { RuleType, AlertExecutorOptions } from '../../types';
import { ParamsSchema } from './rule_type_params';
import { ActionContext } from './action_context';
import { ComparatorFns, getHumanReadableComparator } from '../lib';
import {
  extractReferences,
  injectReferences,
  SerializedSearchSourceFields,
} from '../../../../../../src/plugins/data/common';
import { AlertTypeParams } from '../../../../alerting/common';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';

export const ID = '.search-threshold';
export const ActionGroupId = 'threshold met';
export const ConditionMetAlertInstanceId = 'Search matched threshold';

/**
 * These are the params the user can configure, except searchSourceFields
 * they are matching the index-threshold rule
 */
export type ExtractedSerializedSearchSourceFields = SerializedSearchSourceFields & {
  indexRefName: string;
};

export interface SearchThresholdParams extends AlertTypeParams {
  thresholdComparator: string;
  threshold: number[];
  timeWindowSize: number;
  timeWindowUnit: string;
  searchSource: SerializedSearchSourceFields;
}
export type SearchThresholdExtractedParams = Omit<SearchThresholdParams, 'searchSource'> & {
  searchSource: ExtractedSerializedSearchSourceFields;
};

export type SearchThresholdRuleType = RuleType<
  SearchThresholdParams,
  SearchThresholdExtractedParams,
  {},
  {},
  ActionContext,
  typeof ActionGroupId
>;

export function getRuleType(logger: Logger): SearchThresholdRuleType {
  const alertTypeName = i18n.translate('xpack.stackAlerts.searchThreshold.alertTypeTitle', {
    defaultMessage: 'Search threshold',
  });

  const actionGroupName = i18n.translate(
    'xpack.stackAlerts.searchThreshold.actionGroupThresholdMetTitle',
    {
      defaultMessage: 'Threshold met',
    }
  );

  const actionVariableContextDateLabel = i18n.translate(
    'xpack.stackAlerts.searchThreshold.actionVariableContextDateLabel',
    {
      defaultMessage: 'The date the alert exceeded the threshold.',
    }
  );

  const actionVariableContextValueLabel = i18n.translate(
    'xpack.stackAlerts.searchThreshold.actionVariableContextValueLabel',
    {
      defaultMessage: 'The value that exceeded the threshold.',
    }
  );

  const actionVariableContextMessageLabel = i18n.translate(
    'xpack.stackAlerts.searchThreshold.actionVariableContextMessageLabel',
    {
      defaultMessage: 'A pre-constructed message for the alert.',
    }
  );

  const actionVariableContextTitleLabel = i18n.translate(
    'xpack.stackAlerts.searchThreshold.actionVariableContextTitleLabel',
    {
      defaultMessage: 'A pre-constructed title for the alert.',
    }
  );

  const actionVariableContextThresholdLabel = i18n.translate(
    'xpack.stackAlerts.searchThreshold.actionVariableContextThresholdLabel',
    {
      defaultMessage:
        "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
    }
  );

  const actionVariableContextThresholdComparatorLabel = i18n.translate(
    'xpack.stackAlerts.searchThreshold.actionVariableContextThresholdComparatorLabel',
    {
      defaultMessage: 'A comparison function to use to determine if the threshold as been met.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.searchThreshold.actionVariableContextConditionsLabel',
    {
      defaultMessage: 'A string describing the threshold comparator and threshold',
    }
  );

  return {
    /**
     * Unique identifier for the rule type. By convention, IDs starting with . are reserved for built-in rule types.
     */
    id: ID,
    /**
     * A user-friendly name for the rule type
     */
    name: alertTypeName,
    /**
     * An explicit list of groups the rule type may schedule actions for
     * We just need a single group
     */
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    /**
     * The default group
     */
    defaultActionGroupId: ActionGroupId,
    /**
     * Validator for the parameters (threshold, thresholdComparator) executed before
     * they are passed to the executor function
     */
    validate: {
      params: ParamsSchema,
    },
    /**
     * These are the variables available in the UI in the action parameter templates
     */
    actionVariables: {
      context: [
        { name: 'message', description: actionVariableContextMessageLabel },
        { name: 'title', description: actionVariableContextTitleLabel },
        { name: 'date', description: actionVariableContextDateLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'conditions', description: actionVariableContextConditionsLabel },
      ],
      params: [
        { name: 'threshold', description: actionVariableContextThresholdLabel },
        { name: 'thresholdComparator', description: actionVariableContextThresholdComparatorLabel },
      ],
    },
    minimumLicenseRequired: 'basic',
    /**
     * Whether the rule type is exportable from the Saved Objects Management UI.
     */
    isExportable: true,
    /**
     * This is a function to be called when executing a rule on an interval basis.
     */
    executor,
    /**
     * The id of the application producing this rule type.
     * Since were creating a new stack rule type, we don't set Discover here
     */
    producer: STACK_ALERTS_FEATURE_ID,
    /**
     * The length of time a rule can run before being cancelled due to timeout
     */
    ruleTaskTimeout: '5m',
    /**
     * Used for extract and inject saved object references of search source
     */
    useSavedObjectReferences: {
      extractReferences: (params) => {
        const [searchSourceFields, references] = extractReferences(params.searchSource);
        const newParams = {
          ...params,
          searchSource: searchSourceFields as ExtractedSerializedSearchSourceFields,
        } as SearchThresholdExtractedParams;
        return { params: newParams, references };
      },
      injectReferences: (params, references) => {
        return {
          ...params,
          searchSource: injectReferences(params.searchSource, references),
        } as SearchThresholdParams;
      },
    },
  };

  async function executor(
    options: AlertExecutorOptions<
      SearchThresholdParams,
      { previousTimestamp?: string; previousTimeRange?: { from: string; to: string } },
      {},
      ActionContext,
      typeof ActionGroupId
    >
  ) {
    const { name, params, alertId, state } = options;
    const timestamp = new Date().toISOString();
    logger.debug(`searchThreshold (${alertId}) previousTimestamp: ${state.previousTimestamp}`);
    logger.debug(
      `searchThreshold (${alertId}) searchSource: ${JSON.stringify(params.searchSourceFields)}`
    );

    const compareFn = ComparatorFns.get(params.thresholdComparator);
    if (compareFn == null) {
      throw new Error(
        i18n.translate('xpack.stackAlerts.searchThreshold.invalidComparatorErrorMessage', {
          defaultMessage: 'invalid thresholdComparator specified: {comparator}',
          values: {
            comparator: params.thresholdComparator,
          },
        })
      );
    }

    const nrOfDocs = 10;
    /**
     * Currently this is just triggering a notification if the configured threshold is lower then 10
     * What should be implemented:
     * - Create a scoped search source client using KibanaRequest
     * - Create a searchSource object
     * - Use it to request data from Elasticsearch
     * - Compare number of documents with the configured threshold
     */

    const met = compareFn(nrOfDocs, params.threshold);

    if (met) {
      const conditions = `${nrOfDocs} is ${getHumanReadableComparator(
        params.thresholdComparator
      )} ${params.threshold}`;

      const baseContext: ActionContext = {
        title: name,
        message: `${nrOfDocs} documents found`,
        date: timestamp,
        value: Number(nrOfDocs),
        conditions,
      };

      // this is where the notification is scheduled
      const alertInstance = options.services.alertInstanceFactory(ConditionMetAlertInstanceId);
      alertInstance.scheduleActions(ActionGroupId, baseContext);
    }
    // this is the state that we can access in the next execution
    return {
      previousTimestamp: timestamp,
    };
  }
}
