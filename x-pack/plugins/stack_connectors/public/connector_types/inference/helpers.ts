/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import { isEmpty } from 'lodash/fp';
import { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ConfigEntryView } from '../lib/dynamic_config/types';
import { Config } from './types';
import * as i18n from './translations';

export interface TaskTypeOption {
  id: string;
  value: string;
  label: string;
}

export const getTaskTypeOptions = (taskTypes: string[]): TaskTypeOption[] => {
  const options: TaskTypeOption[] = [];

  taskTypes.forEach((taskType: string) => {
    options.push({
      id: taskType,
      label: taskType,
      value: taskType,
    });
  });
  return options;
};

export const generateInferenceEndpointId = (
  config: Config,
  setFieldValue: (fieldName: string, value: unknown) => void
) => {
  const taskTypeSuffix = config.taskType ? `${config.taskType}-` : '';
  const inferenceEndpointId = `${config.provider}-${taskTypeSuffix}${faker.string
    .nanoid(10)
    .toLowerCase()}`;
  config.inferenceId = inferenceEndpointId;
  setFieldValue('config.inferenceId', inferenceEndpointId);
};

export const missingConfigFieldValidator = (
  ...args: Parameters<ValidationFunc>
): ReturnType<ValidationFunc> => {
  const [{ value, path, formData }] = args;

  const configData = (value ?? {}) as Record<string, unknown>;
  let hasErrors = false;
  if (formData['config.providerSchema']) {
    formData['config.providerSchema'].forEach((field: ConfigEntryView) => {
      if (field.required && path === 'config.providerConfig' && !field.sensitive) {
        if (
          typeof configData[field.key] === 'string' ||
          typeof configData[field.key] === 'number' ||
          typeof configData[field.key] === 'boolean'
        ) {
          if (isEmpty(configData[field.key])) {
            field.validationErrors = [i18n.getRequiredMessage(field.label)];
            field.isValid = false;
            hasErrors = true;
          } else {
            field.validationErrors = [];
            field.isValid = true;
          }
        }
      }
    });

    console.log(formData['config.providerSchema']);

    if (hasErrors) {
      console.log(hasErrors);
      return {
        code: 'ERR_FIELD_MISSING',
        path,
        message: i18n.ACTION_REQUIRED,
      };
    }
  }
};

export const missingSecretsFieldValidator = (
  ...args: Parameters<ValidationFunc>
): ReturnType<ValidationFunc> => {
  const [{ value, path, formData }] = args;

  const configData = (value ?? {}) as Record<string, unknown>;
  let hasErrors = false;
  if (formData['config.providerSchema']) {
    formData['config.providerSchema'].forEach((field: ConfigEntryView) => {
      if (field.required && path === 'secrets.providerSecrets' && field.sensitive) {
        if (
          typeof configData[field.key] === 'string' ||
          typeof configData[field.key] === 'number' ||
          typeof configData[field.key] === 'boolean'
        ) {
          if (isEmpty(configData[field.key])) {
            field.validationErrors = [i18n.getRequiredMessage(field.label)];
            field.isValid = false;
            hasErrors = true;
          } else {
            field.validationErrors = [];
            field.isValid = true;
          }
        }
      }
    });

    console.log(formData['config.providerSchema']);

    if (hasErrors) {
      console.log(hasErrors);

      return {
        code: 'ERR_FIELD_MISSING',
        path,
        message: i18n.ACTION_REQUIRED,
      };
    }
  }
};

export const missingTaskTypeFieldValidator = (
  ...args: Parameters<ValidationFunc>
): ReturnType<ValidationFunc> => {
  const [{ value, path, formData }] = args;

  const taskTypeData = (value ?? {}) as Record<string, unknown>;
  let hasErrors = false;
  if (formData['config.taskTypeSchema']) {
    (formData['config.taskTypeSchema'] ?? []).forEach((field: ConfigEntryView) => {
      if (field.required) {
        if (isEmpty(taskTypeData[field.key])) {
          field.validationErrors = [i18n.getRequiredMessage(field.label)];
          field.isValid = false;
          hasErrors = true;
        } else {
          field.validationErrors = [];
          field.isValid = true;
        }
      }
    });

    if (hasErrors) {
      console.log(hasErrors);

      return {
        code: 'ERR_FIELD_MISSING',
        path,
        message: i18n.ACTION_REQUIRED,
      };
    }
  }
};
