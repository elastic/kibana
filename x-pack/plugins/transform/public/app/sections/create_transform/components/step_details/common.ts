/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeFormField } from '@kbn/ml-form-utils/form_field';
import { initializeFormSection } from '@kbn/ml-form-utils/form_section';
import type { State } from '@kbn/ml-form-utils/form_slice';

import {
  DEFAULT_CONTINUOUS_MODE_DELAY,
  DEFAULT_TRANSFORM_FREQUENCY,
  DEFAULT_TRANSFORM_SETTINGS_DOCS_PER_SECOND,
  DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE,
} from '../../../../../../common/constants';
import type { TransformConfigUnion } from '../../../../../../common/types/transform';

import type { ValidatorName } from '../../../edit_transform/state_management/validators';

export type EsIndexName = string;
export type EsIngestPipelineName = string;
export type DataViewTitle = string;

export interface StepDetailsState {
  continuousModeDateField: string;
  continuousModeDelay: string;
  destinationIngestPipeline: EsIngestPipelineName;
  isContinuousModeEnabled: boolean;
  isRetentionPolicyEnabled: boolean;
  retentionPolicyDateField: string;
  retentionPolicyMaxAge: string;
  transformFrequency: string;
  transformSettingsMaxPageSearchSize?: number;
  transformSettingsDocsPerSecond: number | null;
  transformSettingsNumFailureRetries?: number | string;
  valid: boolean;
  dataViewTimeField?: string | undefined;
  _meta?: Record<string, unknown>;
}

export type StepDetailsFormState = State<
  'description' | 'destinationIndex' | 'transformId',
  'createDataView',
  ValidatorName
>;
export function getDefaultStepDetailsFormState(
  config?: TransformConfigUnion,
  existingTransforms: string[] = []
): StepDetailsFormState {
  return {
    formFields: {
      // top level attributes
      description: initializeFormField('description', 'description', config),
      transformId: initializeFormField('transformId', '', undefined, {
        isOptional: false,
        validator: 'transformIdValidator',
        reservedValues: existingTransforms,
      }),
      destinationIndex: initializeFormField('destinationIndex', 'dest.index', config, {
        isOptional: false,
        validator: 'indexNameValidator',
      }),
    },
    formSections: {
      createDataView: initializeFormSection('createDataView', 'n/a', undefined, {
        defaultEnabled: true,
      }),
    },
  };
}

export function getDefaultStepDetailsState(): StepDetailsState {
  return {
    continuousModeDateField: '',
    continuousModeDelay: DEFAULT_CONTINUOUS_MODE_DELAY,
    isContinuousModeEnabled: false,
    isRetentionPolicyEnabled: false,
    retentionPolicyDateField: '',
    retentionPolicyMaxAge: '',
    transformFrequency: DEFAULT_TRANSFORM_FREQUENCY,
    transformSettingsMaxPageSearchSize: DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE,
    transformSettingsDocsPerSecond: DEFAULT_TRANSFORM_SETTINGS_DOCS_PER_SECOND,
    transformSettingsNumFailureRetries: undefined,
    destinationIngestPipeline: '',
    valid: false,
    dataViewTimeField: undefined,
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
