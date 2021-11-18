/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Logger, SavedObjectReference } from 'src/core/server';
import { AlertType, AlertExecutorOptions } from '../../types';
import { Params, ParamsSchema } from './alert_type_params';
import { ActionContext } from './action_context';
import { ComparatorFns, getHumanReadableComparator } from '../lib';
import {
  getTime,
  parseSearchSourceJSON,
  SearchSourceFields,
} from '../../../../../../src/plugins/data/common';

export const ID = '.discover-threshold';
export const ActionGroupId = 'threshold met';

/**
 * node stolen from the data plugin, needs to moved to `common there`
 */
export const injectSearchSourceReferences = (
  searchSourceFields: SearchSourceFields & { indexRefName: string },
  references: SavedObjectReference[]
) => {
  const searchSourceReturnFields: SearchSourceFields = { ...searchSourceFields };
  // Inject index id if a reference is saved
  if (searchSourceFields.indexRefName) {
    const reference = references.find((ref) => ref.name === searchSourceFields.indexRefName);
    if (!reference) {
      throw new Error(`Could not find reference for ${searchSourceFields.indexRefName}`);
    }
    // @ts-ignore
    searchSourceReturnFields.index = reference.id;
    // @ts-ignore
    delete searchSourceReturnFields.indexRefName;
  }

  if (searchSourceReturnFields.filter && Array.isArray(searchSourceReturnFields.filter)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchSourceReturnFields.filter.forEach((filterRow: any) => {
      if (!filterRow.meta || !filterRow.meta.indexRefName) {
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reference = references.find((ref: any) => ref.name === filterRow.meta.indexRefName);
      if (!reference) {
        throw new Error(`Could not find reference for ${filterRow.meta.indexRefName}`);
      }
      filterRow.meta.index = reference.id;
      delete filterRow.meta.indexRefName;
    });
  }

  return searchSourceReturnFields;
};

export function getAlertType(
  logger: Logger
): AlertType<Params, never, {}, {}, ActionContext, typeof ActionGroupId> {
  const alertTypeName = i18n.translate('xpack.stackAlerts.indexThreshold.alertTypeTitle', {
    defaultMessage: 'Discover threshold',
  });

  const actionGroupName = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionGroupThresholdMetTitle',
    {
      defaultMessage: 'Threshold met',
    }
  );

  const actionVariableContextGroupLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextGroupLabel',
    {
      defaultMessage: 'The group that exceeded the threshold.',
    }
  );

  const actionVariableContextDateLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextDateLabel',
    {
      defaultMessage: 'The date the alert exceeded the threshold.',
    }
  );

  const actionVariableContextValueLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextValueLabel',
    {
      defaultMessage: 'The value that exceeded the threshold.',
    }
  );

  const actionVariableContextMessageLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextMessageLabel',
    {
      defaultMessage: 'A pre-constructed message for the alert.',
    }
  );

  const actionVariableContextTitleLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextTitleLabel',
    {
      defaultMessage: 'A pre-constructed title for the alert.',
    }
  );

  const actionVariableContextThresholdLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextThresholdLabel',
    {
      defaultMessage:
        "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
    }
  );

  const actionVariableContextThresholdComparatorLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextThresholdComparatorLabel',
    {
      defaultMessage: 'A comparison function to use to determine if the threshold as been met.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextConditionsLabel',
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
      ],
      params: [
        { name: 'threshold', description: actionVariableContextThresholdLabel },
        { name: 'thresholdComparator', description: actionVariableContextThresholdComparatorLabel },
        { name: 'searchSourceJSON', description: 'SearchSourceJSON' },
        { name: 'searchSourceReferencesJSON', description: 'searchSourceReferencesJSON' },
        { name: 'timeWindowSize', description: 'Time window size' },
        { name: 'timeWindowUnit', description: 'Time window unit' },
      ],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor,
    producer: 'discover',
    /**
     * These are the new hooks
     **/
    useSavedObjectReferences: {
      extractReferences: (params) => {
        console.log(params);
        return { params, references: [] };
      },
      injectReferences: (params, references) => {
        console.log(params);
        return params;
      },
    },
  };

  async function executor(
    options: AlertExecutorOptions<Params, {}, {}, ActionContext, typeof ActionGroupId>
  ) {
    const { name, services, params } = options;

    const parsedSearchSourceJSON = parseSearchSourceJSON(params.searchSourceJSON);

    const compareFn = ComparatorFns.get(params.thresholdComparator);
    if (compareFn == null) {
      throw new Error(
        i18n.translate('xpack.stackAlerts.indexThreshold.invalidComparatorErrorMessage', {
          defaultMessage: 'invalid thresholdComparator specified: {comparator}',
          values: {
            comparator: params.thresholdComparator,
          },
        })
      );
    }

    try {
      const searchSourceValues = injectSearchSourceReferences(
        parsedSearchSourceJSON as Parameters<typeof injectSearchSourceReferences>[0],
        JSON.parse(params.searchSourceReferencesJSON)
      );
      const searchSourceClient = await services.searchSourceClient;
      const loadedSearchSource = await searchSourceClient.create(searchSourceValues);
      loadedSearchSource.setField('size', 0);
      const filter = getTime(loadedSearchSource.getField('index'), {
        from: `now-${params.timeWindowSize}${params.timeWindowUnit}`,
        to: 'now',
      });
      const searchSourceChild = loadedSearchSource.createChild();
      searchSourceChild.setField('filter', filter);
      const docs = await searchSourceChild.fetch();
      const nrOfDocs = Number(docs.hits.total);
      const met = compareFn(nrOfDocs, params.threshold);

      if (met) {
        const conditions = `${nrOfDocs} is ${getHumanReadableComparator(
          params.thresholdComparator
        )} ${params.threshold}`;
        const instanceId = 'test';
        const date = new Date().toISOString();
        const baseContext: ActionContext = {
          title: name,
          message: `${nrOfDocs} documents found (${conditions})`,
          date,
          group: instanceId,
          value: Number(nrOfDocs),
          conditions,
        };

        const alertInstance = options.services.alertInstanceFactory(instanceId);
        alertInstance.scheduleActions(ActionGroupId, baseContext);
      }
    } catch (e) {
      logger.error(e);
    }
  }
}
