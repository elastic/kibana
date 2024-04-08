/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type RuleTypeParamsExpressionProps,
  type TriggersAndActionsUIPublicPluginSetup,
} from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import React, { lazy } from 'react';
import type { MlCapabilities } from '../../../common/types/capabilities';
import type { MlCoreSetup } from '../../plugin';
import { ML_ALERT_TYPES } from '../../../common';
import type { MlAnomalyDetectionAlertParams } from '../../../common/types/alerts';
import { validateLookbackInterval, validateTopNBucket } from '../validators';

export function registerAnomalyDetectionRule(
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup,
  getStartServices: MlCoreSetup['getStartServices'],
  mlCapabilities: MlCapabilities
) {
  const MlAlertTrigger = lazy(() => import('./ml_anomaly_alert_trigger'));

  triggersActionsUi.ruleTypeRegistry.register({
    id: ML_ALERT_TYPES.ANOMALY_DETECTION,
    description: i18n.translate('xpack.ml.alertTypes.anomalyDetection.description', {
      defaultMessage: 'Alert when anomaly detection jobs results match the condition.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return docLinks.links.ml.alertingRules;
    },
    ruleParamsExpression: (props: RuleTypeParamsExpressionProps<MlAnomalyDetectionAlertParams>) => {
      return (
        <MlAlertTrigger
          {...props}
          getStartServices={getStartServices}
          mlCapabilities={mlCapabilities}
        />
      );
    },
    validate: (ruleParams: MlAnomalyDetectionAlertParams) => {
      const validationResult = {
        errors: {
          jobSelection: new Array<string>(),
          severity: new Array<string>(),
          resultType: new Array<string>(),
          topNBuckets: new Array<string>(),
          lookbackInterval: new Array<string>(),
        } as Record<keyof MlAnomalyDetectionAlertParams, string[]>,
      };

      if (!ruleParams.jobSelection?.jobIds?.length && !ruleParams.jobSelection?.groupIds?.length) {
        validationResult.errors.jobSelection.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.jobSelection.errorMessage', {
            defaultMessage: 'Job selection is required',
          })
        );
      }

      // Since 7.13 we support single job selection only
      if (
        (Array.isArray(ruleParams.jobSelection?.groupIds) &&
          ruleParams.jobSelection?.groupIds.length > 0) ||
        (Array.isArray(ruleParams.jobSelection?.jobIds) &&
          ruleParams.jobSelection?.jobIds.length > 1)
      ) {
        validationResult.errors.jobSelection.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.singleJobSelection.errorMessage', {
            defaultMessage: 'Only one job per rule is allowed',
          })
        );
      }

      if (ruleParams.severity === undefined) {
        validationResult.errors.severity.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.severity.errorMessage', {
            defaultMessage: 'Anomaly severity is required',
          })
        );
      }

      if (ruleParams.resultType === undefined) {
        validationResult.errors.resultType.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.resultType.errorMessage', {
            defaultMessage: 'Result type is required',
          })
        );
      }

      if (!!ruleParams.lookbackInterval && validateLookbackInterval(ruleParams.lookbackInterval)) {
        validationResult.errors.lookbackInterval.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.lookbackInterval.errorMessage', {
            defaultMessage: 'Lookback interval is invalid',
          })
        );
      }

      if (
        typeof ruleParams.topNBuckets === 'number' &&
        validateTopNBucket(ruleParams.topNBuckets)
      ) {
        validationResult.errors.topNBuckets.push(
          i18n.translate('xpack.ml.alertTypes.anomalyDetection.topNBuckets.errorMessage', {
            defaultMessage: 'Number of buckets is invalid',
          })
        );
      }

      return validationResult;
    },
    requiresAppContext: false,
    defaultActionMessage: i18n.translate(
      'xpack.ml.alertTypes.anomalyDetection.defaultActionMessage',
      {
        defaultMessage: `['{{rule.name}}'] Elastic Stack Machine Learning Alert:
- Job IDs: '{{context.jobIds}}'
- Time: '{{context.timestampIso8601}}'
- Anomaly score: '{{context.score}}'

'{{context.message}}'

'{{#context.topInfluencers.length}}'
  Top influencers:
  '{{#context.topInfluencers}}'
    '{{influencer_field_name}}' = '{{influencer_field_value}}' ['{{score}}']
  '{{/context.topInfluencers}}'
'{{/context.topInfluencers.length}}'

'{{#context.topRecords.length}}'
  Top records:
  '{{#context.topRecords}}'
    '{{function}}'('{{field_name}}') '{{by_field_value}}''{{over_field_value}}''{{partition_field_value}}' ['{{score}}']. Typical: '{{typical}}', Actual: '{{actual}}'
  '{{/context.topRecords}}'
'{{/context.topRecords.length}}'

'{{! Replace kibanaBaseUrl if not configured in Kibana }}'
[Open in Anomaly Explorer]('{{\\{kibanaBaseUrl}}'\\}'{{\\{context.anomalyExplorerUrl}}'\\})
`,
      }
    ),
  });
}
