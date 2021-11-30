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

export const ID = '.search-threshold';
export const ActionGroupId = 'threshold met';

export interface DiscoverThresholdParams extends AlertTypeParams {
  thresholdComparator: string;
  threshold: number[];
  timeWindowSize: number;
  timeWindowUnit: string;
  searchSourceFields: SearchSourceFields;
  urlTemplate?: string;
}
export type DiscoverThresholdExtractedParams = Omit<
  DiscoverThresholdParams,
  'searchSourceFields'
> & {
  searchSourceFields: SearchSourceFields & { indexRefName: string };
};

export type DiscoverAlertType = AlertType<
  DiscoverThresholdParams,
  DiscoverThresholdExtractedParams,
  {},
  {},
  ActionContext,
  typeof ActionGroupId
>;

export function getAlertType(
  logger: Logger,
  share: SharePluginSetup,
  core: CoreSetup
): DiscoverAlertType {
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
    id: ID,
    name: alertTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    validate: {
      params: ParamsSchema,
    },
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
        { name: 'urlTemplate', description: 'Can contain a URL template' },
      ],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor,
    producer: 'discover',
    useSavedObjectReferences: {
      extractReferences: (params) => {
        const [searchSourceFields, references] = extractReferences(params.searchSourceFields);
        const newParams = { ...params, searchSourceFields } as DiscoverThresholdExtractedParams;
        return { params: newParams, references };
      },
      injectReferences: (params, references) => {
        return {
          ...params,
          searchSourceFields: injectReferences(params.searchSourceFields, references),
        } as DiscoverThresholdParams;
      },
    },
  };
  async function executor(
    options: AlertExecutorOptions<
      DiscoverThresholdParams,
      {},
      {},
      ActionContext,
      typeof ActionGroupId
    >
  ) {
    const { name, services, params, alertId, state } = options;

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
    const filter = getTime(index, {
      from: `now-${params.timeWindowSize}${params.timeWindowUnit}`,
      to: 'now',
    });
    const searchSourceChild = loadedSearchSource.createChild();
    searchSourceChild.setField('filter', filter);
    const docs = await searchSourceChild.fetch();
    const nrOfDocs = Number(docs.hits.total);
    const met = compareFn(nrOfDocs, params.threshold);

    if (met) {
      // This code is generating a link to Discover containing the alertId and the time range.
      // When the user navigates by this link, the query is built by the info provided
      // by the rule. Which means, that it could have been modified in the meantime
      // @TODO, there should be a checksum addon to verify if the searchSource was changed
      // In this case the user should be notified that the displayed data when opening the link
      // is a might be different to the data that triggered the alert.
      const link = (
        params.urlTemplate ??
        '{{basePath}}/app/discover#/viewAlert/{{alertId}}?from={{from}}&to={{to}}'
      )
        .replace('{{alertId}}', alertId)
        .replace('{{basePath}}', core.http.basePath.publicBaseUrl ?? '')
        .replace('{{from}}', filter?.query.range[timeFieldName].gte ?? '')
        .replace('{{to}}', filter?.query.range[timeFieldName].lte ?? '');

      const conditions = `${nrOfDocs} is ${getHumanReadableComparator(
        params.thresholdComparator
      )} ${params.threshold}`;

      const timestamp = new Date().toISOString();
      // just for testing
      const instanceId = timestamp;
      const baseContext: ActionContext = {
        title: name,
        message: `${nrOfDocs} documents found (${conditions})`,
        date: timestamp,
        group: instanceId,
        value: Number(nrOfDocs),
        conditions,
        link,
      };

      const alertInstance = options.services.alertInstanceFactory(instanceId);
      // store the params we would need to recreate the query that led to this alert instance
      alertInstance.replaceState({
        latestTimestamp: timestamp,
        lastSearchSource: params.searchSourceFields,
        lastTimeRange: filter!.query.range,
      });
      alertInstance.scheduleActions(ActionGroupId, baseContext);
      return {
        latestTimestamp: timestamp,
        lastSearchSource: params.searchSourceFields,
        lastTimeRange: filter!.query.range,
      };
    }

    return state;
  }
}
