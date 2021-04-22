/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityFieldType } from './anomalies';

export const ML_ENTITY_FIELDS_CONFIG = 'ml.singleMetricViewer.partitionFields';

export const ML_APPLY_TIME_RANGE_CONFIG = 'ml.jobSelectorFlyout.applyTimeRange';

export type PartitionFieldConfig =
  | {
      /**
       * Relevant for jobs with enabled model plot.
       * If true, entity values are based on records with anomalies.
       * Otherwise aggregated from the model plot results.
       */
      anomalousOnly: boolean;
      /**
       * Relevant for jobs with disabled model plot.
       * If true, entity values are filtered by the active time range.
       * If false, the lists consist of the values from all existing records.
       */
      applyTimeRange: boolean;
      sort: {
        by: 'anomaly_score' | 'name';
        order: 'asc' | 'desc';
      };
    }
  | undefined;

export type PartitionFieldsConfig =
  | Partial<Record<EntityFieldType, PartitionFieldConfig>>
  | undefined;

export type ApplyTimeRangeConfig = boolean | undefined;

export type MlStorage = Partial<{
  [ML_ENTITY_FIELDS_CONFIG]: PartitionFieldsConfig;
  [ML_APPLY_TIME_RANGE_CONFIG]: ApplyTimeRangeConfig;
}> | null;
