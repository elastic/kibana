/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_CONTINUOUS_MODE_DELAY,
  DEFAULT_TRANSFORM_FREQUENCY,
  DEFAULT_TRANSFORM_SETTINGS_DOCS_PER_SECOND,
  DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE,
} from '../../../../common/';
import type { TransformConfigUnion, TransformId } from '../../../../../../common/types/transform';

export type EsIndexName = string;
export type EsIngestPipelineName = string;
export type DataViewTitle = string;

export interface StepDetailsExposedState {
  continuousModeDateField: string;
  continuousModeDelay: string;
  createDataView: boolean;
  destinationIndex: EsIndexName;
  destinationIngestPipeline: EsIngestPipelineName;
  isContinuousModeEnabled: boolean;
  isRetentionPolicyEnabled: boolean;
  retentionPolicyDateField: string;
  retentionPolicyMaxAge: string;
  touched: boolean;
  transformId: TransformId;
  transformDescription: string;
  transformFrequency: string;
  transformSettingsMaxPageSearchSize: number;
  transformSettingsDocsPerSecond: number | null;
  valid: boolean;
  dataViewTimeField?: string | undefined;
  _meta?: Record<string, unknown>;
}

export function getDefaultStepDetailsState(): StepDetailsExposedState {
  return {
    continuousModeDateField: '',
    continuousModeDelay: DEFAULT_CONTINUOUS_MODE_DELAY,
    createDataView: true,
    isContinuousModeEnabled: false,
    isRetentionPolicyEnabled: false,
    retentionPolicyDateField: '',
    retentionPolicyMaxAge: '',
    transformId: '',
    transformDescription: '',
    transformFrequency: DEFAULT_TRANSFORM_FREQUENCY,
    transformSettingsMaxPageSearchSize: DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE,
    transformSettingsDocsPerSecond: DEFAULT_TRANSFORM_SETTINGS_DOCS_PER_SECOND,
    destinationIndex: '',
    destinationIngestPipeline: '',
    touched: false,
    valid: false,
    dataViewTimeField: undefined,
  };
}

export function applyTransformConfigToDetailsState(
  state: StepDetailsExposedState,
  transformConfig?: TransformConfigUnion
): StepDetailsExposedState {
  // apply the transform configuration to wizard DETAILS state
  if (transformConfig !== undefined) {
    // Continuous mode
    const continuousModeTime = transformConfig.sync?.time;
    if (continuousModeTime !== undefined) {
      state.continuousModeDateField = continuousModeTime.field;
      state.continuousModeDelay = continuousModeTime?.delay ?? DEFAULT_CONTINUOUS_MODE_DELAY;
      state.isContinuousModeEnabled = true;
    }

    // Description
    if (transformConfig.description !== undefined) {
      state.transformDescription = transformConfig.description;
    }

    // Ingest Pipeline
    if (transformConfig.dest.pipeline !== undefined) {
      state.destinationIngestPipeline = transformConfig.dest.pipeline;
    }

    // Frequency
    if (transformConfig.frequency !== undefined) {
      state.transformFrequency = transformConfig.frequency;
    }

    // Retention policy
    const retentionPolicyTime = transformConfig.retention_policy?.time;
    if (retentionPolicyTime !== undefined) {
      state.retentionPolicyDateField = retentionPolicyTime.field;
      state.retentionPolicyMaxAge = retentionPolicyTime.max_age;
      state.isRetentionPolicyEnabled = true;
    }

    // Settings
    if (transformConfig.settings) {
      if (typeof transformConfig.settings?.max_page_search_size === 'number') {
        state.transformSettingsMaxPageSearchSize = transformConfig.settings.max_page_search_size;
      }
      if (typeof transformConfig.settings?.docs_per_second === 'number') {
        state.transformSettingsDocsPerSecond = transformConfig.settings.docs_per_second;
      } else {
        state.transformSettingsDocsPerSecond = null;
      }
    }

    if (transformConfig._meta) {
      state._meta = transformConfig._meta;
    }
  }
  return state;
}
