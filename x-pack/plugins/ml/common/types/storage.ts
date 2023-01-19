/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FrozenTierPreference } from '@kbn/ml-date-picker';

import { EntityFieldType } from './anomalies';

export const ML_ENTITY_FIELDS_CONFIG = 'ml.singleMetricViewer.partitionFields' as const;
export const ML_APPLY_TIME_RANGE_CONFIG = 'ml.jobSelectorFlyout.applyTimeRange';
export const ML_GETTING_STARTED_CALLOUT_DISMISSED = 'ml.gettingStarted.isDismissed';
export const ML_FROZEN_TIER_PREFERENCE = 'ml.frozenDataTierPreference';
export const ML_ANOMALY_EXPLORER_PANELS = 'ml.anomalyExplorerPanels';
export const ML_NOTIFICATIONS_LAST_CHECKED_AT = 'ml.notificationsLastCheckedAt';

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

export interface PanelState {
  size: number;
  isCollapsed: boolean;
}

export interface AnomalyExplorerPanelsState {
  topInfluencers: PanelState;
  mainPage: { size: number };
}

export interface MlStorageRecord {
  [key: string]: unknown;
  [ML_ENTITY_FIELDS_CONFIG]: PartitionFieldsConfig;
  [ML_APPLY_TIME_RANGE_CONFIG]: ApplyTimeRangeConfig;
  [ML_GETTING_STARTED_CALLOUT_DISMISSED]: boolean | undefined;
  [ML_FROZEN_TIER_PREFERENCE]: FrozenTierPreference;
  [ML_ANOMALY_EXPLORER_PANELS]: AnomalyExplorerPanelsState | undefined;
  [ML_NOTIFICATIONS_LAST_CHECKED_AT]: number | undefined;
}

export type MlStorage = Partial<MlStorageRecord> | null;

export type MlStorageKey = keyof Exclude<MlStorage, null>;

export type TMlStorageMapped<T extends MlStorageKey> = T extends typeof ML_ENTITY_FIELDS_CONFIG
  ? PartitionFieldsConfig
  : T extends typeof ML_APPLY_TIME_RANGE_CONFIG
  ? ApplyTimeRangeConfig
  : T extends typeof ML_GETTING_STARTED_CALLOUT_DISMISSED
  ? boolean | undefined
  : T extends typeof ML_FROZEN_TIER_PREFERENCE
  ? FrozenTierPreference | undefined
  : T extends typeof ML_ANOMALY_EXPLORER_PANELS
  ? AnomalyExplorerPanelsState | undefined
  : T extends typeof ML_NOTIFICATIONS_LAST_CHECKED_AT
  ? number | undefined
  : null;

export const ML_STORAGE_KEYS = [
  ML_ENTITY_FIELDS_CONFIG,
  ML_APPLY_TIME_RANGE_CONFIG,
  ML_GETTING_STARTED_CALLOUT_DISMISSED,
  ML_FROZEN_TIER_PREFERENCE,
  ML_ANOMALY_EXPLORER_PANELS,
  ML_NOTIFICATIONS_LAST_CHECKED_AT,
] as const;
