/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { ALERT_PREVIEW_SAMPLE_SIZE } from '../../../common/constants/alerts';
import { ANOMALY_RESULT_TYPE } from '../../../common/constants/anomalies';

export const mlAnomalyDetectionAlertParams = schema.object({
  jobSelection: schema.object(
    {
      jobIds: schema.arrayOf(schema.string(), { defaultValue: [] }),
      groupIds: schema.arrayOf(schema.string(), { defaultValue: [] }),
    },
    {
      validate: (v) => {
        if (!v.jobIds?.length && !v.groupIds?.length) {
          return i18n.translate('xpack.ml.alertTypes.anomalyDetection.jobSelection.errorMessage', {
            defaultMessage: 'Job selection is required',
          });
        }
      },
    }
  ),
  /** Anomaly score threshold  */
  severity: schema.number({ min: 0, max: 100 }),
  /** Result type to alert upon  */
  resultType: schema.oneOf([
    schema.literal(ANOMALY_RESULT_TYPE.RECORD),
    schema.literal(ANOMALY_RESULT_TYPE.BUCKET),
    schema.literal(ANOMALY_RESULT_TYPE.INFLUENCER),
  ]),
  includeInterim: schema.boolean({ defaultValue: true }),
  /** User's override for the lookback interval */
  lookbackInterval: schema.nullable(schema.string()),
  /** User's override for the top N buckets  */
  topNBuckets: schema.nullable(schema.number({ min: 1 })),
});

export const mlAnomalyDetectionAlertPreviewRequest = schema.object({
  alertParams: mlAnomalyDetectionAlertParams,
  /**
   * Relative time range to look back from now, e.g. 1y, 8m, 15d
   */
  timeRange: schema.string(),
  /**
   * Number of top hits to return
   */
  sampleSize: schema.number({ defaultValue: ALERT_PREVIEW_SAMPLE_SIZE, min: 0 }),
});

export type MlAnomalyDetectionAlertParams = TypeOf<typeof mlAnomalyDetectionAlertParams>;

export type MlAnomalyDetectionAlertPreviewRequest = TypeOf<
  typeof mlAnomalyDetectionAlertPreviewRequest
>;
