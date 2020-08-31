/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Service } from '../../types';
import { BUILT_IN_ALERTS_FEATURE_ID } from '../../../common';

// import { CoreQueryParamsSchemaProperties } from './lib/core_query_types';
import { getGeoThresholdExecutor } from './geo_threshold';
// const ActionGroupId = 'threshold met';
// const ComparatorFns = getComparatorFns();
// export const ComparatorFnNames = new Set(ComparatorFns.keys());

export const GEO_THRESHOLD_ID = '.geo-threshold';

export function getAlertType(
  service: Service
): {
  defaultActionGroupId: string;
  actionVariables: any[];
  actionGroups: Array<{ name: string; id: string }>;
  executor: ({
    previousStartedAt: currIntervalStartTime,
    startedAt: currIntervalEndTime,
    services,
    params,
  }: {
    previousStartedAt: any;
    startedAt: any;
    services: any;
    params: any;
  }) => Promise<void>;
  name: string;
  producer: string;
  id: string;
} {
  const alertTypeName = i18n.translate('xpack.alertingBuiltins.indexThreshold.alertTypeTitle', {
    defaultMessage: 'Geo tracking threshold',
  });

  const ActionGroupId = 'tracking threshold met';
  const actionGroupName = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.actionGroupThresholdMetTitle',
    {
      defaultMessage: 'Tracking threshold Met',
    }
  );

  const actionVariableContextGroupLabel = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.actionVariableContextGroupLabel',
    {
      defaultMessage: 'The group that exceeded the threshold.',
    }
  );

  const actionVariableContextDateLabel = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.actionVariableContextDateLabel',
    {
      defaultMessage: 'The date the alert exceeded the threshold.',
    }
  );

  const actionVariableContextValueLabel = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.actionVariableContextValueLabel',
    {
      defaultMessage: 'The value that exceeded the threshold.',
    }
  );

  const actionVariableContextMessageLabel = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.actionVariableContextMessageLabel',
    {
      defaultMessage: 'A pre-constructed message for the alert.',
    }
  );

  const actionVariableContextTitleLabel = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.actionVariableContextTitleLabel',
    {
      defaultMessage: 'A pre-constructed title for the alert.',
    }
  );

  const actionVariableContextThresholdLabel = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.actionVariableContextThresholdLabel',
    {
      defaultMessage:
        "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
    }
  );

  const actionVariableContextThresholdComparatorLabel = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.actionVariableContextThresholdComparatorLabel',
    {
      defaultMessage: 'A comparison function to use to determine if the threshold as been met.',
    }
  );

  // const alertParamsVariables = Object.keys(CoreQueryParamsSchemaProperties).map(
  //   (propKey: string) => {
  //     return {
  //       name: propKey,
  //       description: propKey,
  //     };
  //   }
  // );

  return {
    id: GEO_THRESHOLD_ID,
    name: alertTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    actionVariables: [],
    executor: getGeoThresholdExecutor(service),
    producer: BUILT_IN_ALERTS_FEATURE_ID,
  };
  // validate: {
  //   params: ParamsSchema,
  // },
  // actionVariables: {
  //   context: [
  //     { name: 'message', description: actionVariableContextMessageLabel },
  //     { name: 'title', description: actionVariableContextTitleLabel },
  //     { name: 'group', description: actionVariableContextGroupLabel },
  //     { name: 'date', description: actionVariableContextDateLabel },
  //     { name: 'value', description: actionVariableContextValueLabel },
  //   ],
  //   params: [
  //     { name: 'threshold', description: actionVariableContextThresholdLabel },
  //     { name: 'thresholdComparator', description: actionVariableContextThresholdComparatorLabel },
  //     ...alertParamsVariables,
  //   ],
  // },
}
