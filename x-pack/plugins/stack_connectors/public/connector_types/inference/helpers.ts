/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ConfigEntryView } from '../../../common/dynamic_config/types';
import { Config } from './types';
import * as i18n from './translations';

export interface TaskTypeOption {
  id: string;
  value: string;
  label: string;
}

export const getTaskTypeOptions = (taskTypes: string[]): TaskTypeOption[] =>
  taskTypes.map((taskType) => ({
    id: taskType,
    label: taskType,
    value: taskType,
  }));

export const generateInferenceEndpointId = (
  config: Config,
  setFieldValue: (fieldName: string, value: unknown) => void
) => {
  const taskTypeSuffix = config.taskType ? `${config.taskType}-` : '';
  const inferenceEndpointId = `${config.provider}-${taskTypeSuffix}${Math.random()
    .toString(36)
    .slice(2)}`;
  config.inferenceId = inferenceEndpointId;
  setFieldValue('config.inferenceId', inferenceEndpointId);
};

export const getNonEmptyValidator = (
  schema: ConfigEntryView[],
  validationEventHandler: (fieldsWithErrors: ConfigEntryView[]) => void,
  isSubmitting: boolean = false,
  isSecrets: boolean = false
) => {
  return (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc> => {
    const [{ value, path }] = args;
    const newSchema: ConfigEntryView[] = [];

    const configData = (value ?? {}) as Record<string, unknown>;
    let hasErrors = false;
    if (schema) {
      schema
        .filter((f: ConfigEntryView) => f.required)
        .forEach((field: ConfigEntryView) => {
          // validate if submitting or on field edit - value is not default to null
          if (configData[field.key] !== null || isSubmitting) {
            // validate secrets fields separately from regular
            if (isSecrets ? field.sensitive : !field.sensitive) {
              if (
                !configData[field.key] ||
                (typeof configData[field.key] === 'string' && isEmpty(configData[field.key]))
              ) {
                field.validationErrors = [i18n.getRequiredMessage(field.label)];
                field.isValid = false;
                hasErrors = true;
              } else {
                field.validationErrors = [];
                field.isValid = true;
              }
            }
          }
          newSchema.push(field);
        });

      validationEventHandler(newSchema.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      if (hasErrors) {
        return {
          code: 'ERR_FIELD_MISSING',
          path,
          message: i18n.getRequiredMessage('Action'),
        };
      }
    }
  };
};
