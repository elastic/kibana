/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EntityFieldType } from './anomalies';

export const ML_PARTITION_FIELDS_CONFIG = 'ml.singleMetricViewer.partitionFields';

export type PartitionFieldConfig =
  | {
      anomalousOnly: boolean;
      sort: {
        by: string; // 'anomaly_score' | 'name';
        order: string; // 'asc' | 'desc';
      };
    }
  | undefined;

export type PartitionFieldsConfig =
  | Partial<Record<EntityFieldType, PartitionFieldConfig>>
  | undefined;

export type MlStorage = Partial<{
  [ML_PARTITION_FIELDS_CONFIG]: PartitionFieldsConfig;
}> | null;
