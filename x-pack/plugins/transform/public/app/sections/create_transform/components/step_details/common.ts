/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformId, TransformPivotConfig } from '../../../../../../common/types/transform';

export type EsIndexName = string;
export type IndexPatternTitle = string;

export interface StepDetailsExposedState {
  continuousModeDateField: string;
  continuousModeDelay: string;
  createIndexPattern: boolean;
  destinationIndex: EsIndexName;
  isContinuousModeEnabled: boolean;
  isRetentionPolicyEnabled: boolean;
  retentionPolicyDateField: string;
  retentionPolicyMaxAge: string;
  touched: boolean;
  transformId: TransformId;
  transformDescription: string;
  transformFrequency: string;
  transformSettingsMaxPageSearchSize: number;
  transformSettingsDocsPerSecond?: number;
  valid: boolean;
  indexPatternTimeField?: string | undefined;
}

const defaultContinuousModeDelay = '60s';
const defaultTransformFrequency = '1m';
const defaultTransformSettingsMaxPageSearchSize = 500;

export function getDefaultStepDetailsState(): StepDetailsExposedState {
  return {
    continuousModeDateField: '',
    continuousModeDelay: defaultContinuousModeDelay,
    createIndexPattern: true,
    isContinuousModeEnabled: false,
    isRetentionPolicyEnabled: false,
    retentionPolicyDateField: '',
    retentionPolicyMaxAge: '',
    transformId: '',
    transformDescription: '',
    transformFrequency: defaultTransformFrequency,
    transformSettingsMaxPageSearchSize: defaultTransformSettingsMaxPageSearchSize,
    destinationIndex: '',
    touched: false,
    valid: false,
    indexPatternTimeField: undefined,
  };
}

export function applyTransformConfigToDetailsState(
  state: StepDetailsExposedState,
  transformConfig?: TransformPivotConfig
): StepDetailsExposedState {
  // apply the transform configuration to wizard DETAILS state
  if (transformConfig !== undefined) {
    // Continuous mode
    const continuousModeTime = transformConfig.sync?.time;
    if (continuousModeTime !== undefined) {
      state.continuousModeDateField = continuousModeTime.field;
      state.continuousModeDelay = continuousModeTime?.delay ?? defaultContinuousModeDelay;
      state.isContinuousModeEnabled = true;
    }

    // Description
    if (transformConfig.description !== undefined) {
      state.transformDescription = transformConfig.description;
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
      }
    }
  }
  return state;
}
