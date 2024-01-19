/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeFormField } from '@kbn/ml-form-utils/form_field';
import { initializeFormSection } from '@kbn/ml-form-utils/form_section';

import {
  DEFAULT_CONTINUOUS_MODE_DELAY,
  DEFAULT_TRANSFORM_FREQUENCY,
  DEFAULT_TRANSFORM_SETTINGS_DOCS_PER_SECOND,
  DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE,
} from '../../../../../../common/constants';
import type { TransformConfigUnion } from '../../../../../../common/types/transform';

export interface StepDetailsState {
  continuousModeDateField: string;
  continuousModeDelay: string;
  isContinuousModeEnabled: boolean;
  transformFrequency: string;
  transformSettingsMaxPageSearchSize?: number;
  transformSettingsDocsPerSecond: number | null;
  transformSettingsNumFailureRetries?: number | string;
  valid: boolean;
  _meta?: Record<string, unknown>;
}

export const getStepDetailsFormFields = (
  config?: TransformConfigUnion,
  existingTransforms: string[] = []
) => [
  // top level attributes
  initializeFormField('description', 'description', config),
  initializeFormField('transformId', undefined, undefined, {
    isOptional: false,
    validator: 'transformIdValidator',
    reservedValues: existingTransforms,
  }),

  // destination index
  initializeFormField('destinationIndex', 'dest.index', undefined, {
    isOptional: false,
    validator: 'indexNameValidator',
  }),
  // optional ingest pipeline
  initializeFormField('destinationIngestPipeline', 'dest.pipeline', config),
  initializeFormField('dataViewTimeField', undefined, config, {
    validator: 'stringValidator',
    section: 'createDataView',
  }),
  // retention_policy.*
  initializeFormField('retentionPolicyField', 'retention_policy.time.field', config, {
    dependsOn: ['retentionPolicyMaxAge'],
    isNullable: false,
    isOptional: true,
    isOptionalInSection: false,
    section: 'retentionPolicy',
  }),
  initializeFormField('retentionPolicyMaxAge', 'retention_policy.time.max_age', config, {
    dependsOn: ['retentionPolicyField'],
    isNullable: false,
    isOptional: true,
    isOptionalInSection: false,
    section: 'retentionPolicy',
    validator: 'retentionPolicyMaxAgeValidator',
  }),
];

export const getStepDetailsFormSections = (config?: TransformConfigUnion) => [
  initializeFormSection('createDataView', undefined, undefined, {
    defaultEnabled: true,
  }),
  initializeFormSection('retentionPolicy', 'retention_policy', config),
];

export function getDefaultStepDetailsState(): StepDetailsState {
  return {
    continuousModeDateField: '',
    continuousModeDelay: DEFAULT_CONTINUOUS_MODE_DELAY,
    isContinuousModeEnabled: false,
    transformFrequency: DEFAULT_TRANSFORM_FREQUENCY,
    transformSettingsMaxPageSearchSize: DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE,
    transformSettingsDocsPerSecond: DEFAULT_TRANSFORM_SETTINGS_DOCS_PER_SECOND,
    transformSettingsNumFailureRetries: undefined,
    valid: false,
  };
}

export function applyTransformConfigToDetailsState(
  state: StepDetailsState,
  transformConfig?: TransformConfigUnion
): StepDetailsState {
  // apply the transform configuration to wizard DETAILS state
  if (transformConfig !== undefined) {
    // Continuous mode
    const continuousModeTime = transformConfig.sync?.time;
    if (continuousModeTime !== undefined) {
      state.continuousModeDateField = continuousModeTime.field;
      state.continuousModeDelay = continuousModeTime?.delay ?? DEFAULT_CONTINUOUS_MODE_DELAY;
      state.isContinuousModeEnabled = true;
    }

    // Frequency
    if (transformConfig.frequency !== undefined) {
      state.transformFrequency = transformConfig.frequency;
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
      if (typeof transformConfig.settings?.num_failure_retries === 'number') {
        state.transformSettingsNumFailureRetries = transformConfig.settings.num_failure_retries;
      }
    }

    if (transformConfig._meta) {
      state._meta = transformConfig._meta;
    }
  }
  return state;
}
