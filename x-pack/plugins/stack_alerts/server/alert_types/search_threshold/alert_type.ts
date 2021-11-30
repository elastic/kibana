/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Logger } from 'src/core/server';
import { CoreSetup } from 'kibana/server';
import { AlertType, AlertExecutorOptions } from '../../types';
import { ParamsSchema } from './alert_type_params';
import { ActionContext } from './action_context';
import { ComparatorFns, getHumanReadableComparator } from '../lib';
import {
  getTime,
  SearchSourceFields,
  extractReferences,
  injectReferences,
} from '../../../../../../src/plugins/data/common';
import { AlertTypeParams } from '../../../../alerting/common';
import { SharePluginSetup } from '../../../../../../src/plugins/share/server';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';

export const ID = '.search-threshold';
export const ActionGroupId = 'threshold met';
export const ConditionMetAlertInstanceId = 'Search matched threshold';

/**
 * These are the params the user can configure, except searchSourceFields
 * they are matching the index-threshold rule
 */
export interface SearchThresholdParams extends AlertTypeParams {
  thresholdComparator: string;
  threshold: number[];
  timeWindowSize: number;
  timeWindowUnit: string;
  searchSourceFields: SearchSourceFields;
}
export type SearchThresholdExtractedParams = Omit<SearchThresholdParams, 'searchSourceFields'> & {
  searchSourceFields: SearchSourceFields & { indexRefName: string };
};

export type SearchThresholdAlertType = AlertType<
  SearchThresholdParams,
  SearchThresholdExtractedParams,
  {},
  {},
  ActionContext,
  typeof ActionGroupId
>;

export function getAlertType(
  logger: Logger,
  share: SharePluginSetup,
  core: CoreSetup
): SearchThresholdAlertType {
  const alertTypeName = i18n.translate('xpack.stackAlerts.searchThreshold.alertTypeTitle', {
    defaultMessage: 'Search threshold',
  });

  const actionGroupName = i18n.translate(
    'xpack.stackAlerts.searchThreshold.actionGroupThresholdMetTitle',
    {
      defaultMessage: 'Threshold met',
    }
  );

  const actionVariableContextGroupLabel = i18n.translate(
    'xpack.stackAlerts.searchThreshold.actionVariableContextGroupLabel',
    {
      defaultMessage: 'The group that exceeded the threshold.',
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
        { name: 'group', description: actionVariableContextGroupLabel },
        { name: 'date', description: actionVariableContextDateLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'conditions', description: actionVariableContextConditionsLabel },
        { name: 'link', description: 'A link to see the records that triggered this alert' },
      ],
      params: [
        { name: 'threshold', description: actionVariableContextThresholdLabel },
        { name: 'thresholdComparator', description: actionVariableContextThresholdComparatorLabel },
        { name: 'timeWindowSize', description: 'Time window size' },
        { name: 'timeWindowUnit', description: 'Time window unit' },
        { name: 'searchSourceFields', description: 'SearchSourceFields' },
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
        const [searchSourceFields, references] = extractReferences(params.searchSourceFields);
        const newParams = { ...params, searchSourceFields } as SearchThresholdExtractedParams;
        return { params: newParams, references };
      },
      injectReferences: (params, references) => {
        return {
          ...params,
          searchSourceFields: injectReferences(params.searchSourceFields, references),
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
    const { name, services, params, alertId, state } = options;
    const publicBaseUrl = core.http.basePath.publicBaseUrl ?? '';
    const timestamp = new Date().toISOString();
    logger.info(`searchThreshold (${alertId}) previousTimestamp: ${state.previousTimestamp}`);

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

    // @TODO: this is working but should be solved by not by providing a service in the alerting plugin
    // The alerting needs to provide a KibanaRequest object that would allow to create
    // a search source client here like this
    // data.search.searchSource.asScoped(KibanaRequest)
    const searchSourceClient = await services.searchSourceClient;
    const loadedSearchSource = await searchSourceClient.create(params.searchSourceFields);
    const index = loadedSearchSource.getField('index');
    const timeFieldName = index?.timeFieldName;
    if (!timeFieldName) {
      throw new Error('Invalid data view without timeFieldName');
    }

    loadedSearchSource.setField('size', 0);
    // the current state is we don't apply any logic to adapt the time range to prevent
    // blind spots
    const filter = getTime(index, {
      from: `now-${params.timeWindowSize}${params.timeWindowUnit}`,
      to: 'now',
    });
    const from = filter?.query.range[timeFieldName].gte;
    const to = filter?.query.range[timeFieldName].lte;

    const searchSourceChild = loadedSearchSource.createChild();
    searchSourceChild.setField('filter', filter);
    let nrOfDocs = 0;

    try {
      logger.info(
        `searchThreshold (${alertId}) query: ${JSON.stringify(
          searchSourceChild.getSearchRequestBody()
        )}`
      );
      const docs = await searchSourceChild.fetch();
      nrOfDocs = Number(docs.hits.total);
      logger.info(`searchThreshold (${alertId}) nrOfDocs: ${nrOfDocs}`);
    } catch (e) {
      logger.error('Error fetching documents', e);
      throw e;
    }

    const met = compareFn(nrOfDocs, params.threshold);

    if (met) {
      // This code is generating a link to Discover containing the alertId and the time range.
      // When the user navigates by this link, the query is built by the info provided
      // by the rule. Which means, that it could have been modified in the meantime
      // @TODO, there should be a checksum addon to verify if the searchSource was changed
      // In this case the user should be notified that the displayed data when opening the link
      // is a might be different to the data that triggered the alert.
      const link = `${publicBaseUrl}/app/discover#/viewAlert/${alertId}?from${from}&to=${to}`;

      const conditions = `${nrOfDocs} is ${getHumanReadableComparator(
        params.thresholdComparator
      )} ${params.threshold}`;

      const baseContext: ActionContext = {
        title: name,
        message: `${nrOfDocs} documents found (${conditions})`,
        date: timestamp,
        group: ConditionMetAlertInstanceId,
        value: Number(nrOfDocs),
        conditions,
        link,
      };

      // this is where the notification is scheduled
      const alertInstance = options.services.alertInstanceFactory(ConditionMetAlertInstanceId);
      alertInstance.scheduleActions(ActionGroupId, baseContext);
    }
    // this is the state that we can access in the next execution
    return {
      previousTimestamp: timestamp,
      previousTimeRange: { from, to },
    };
  }
}
