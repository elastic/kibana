/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormSchema, FIELD_TYPES, fieldValidators, fieldFormatters } from '../../../shared_imports';

const { emptyField, isJsonField } = fieldValidators;
const { toInt } = fieldFormatters;

const stringifyJson = (json: { [key: string]: any }): string =>
  Object.keys(json).length ? JSON.stringify(json, null, 2) : '{\n\n}';

const parseJson = (jsonString: string): object => {
  let parsedJSON: any;

  try {
    parsedJSON = JSON.parse(jsonString);
  } catch {
    parsedJSON = {};
  }

  return parsedJSON;
};

export const pipelineFormSchema: FormSchema = {
  name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.form.nameFieldLabel', {
      defaultMessage: 'Name',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.form.pipelineNameRequiredError', {
            defaultMessage: 'Name is required.',
          })
        ),
      },
    ],
  },
  description: {
    type: FIELD_TYPES.TEXTAREA,
    label: i18n.translate('xpack.ingestPipelines.form.descriptionFieldLabel', {
      defaultMessage: 'Description (optional)',
    }),
  },
  version: {
    type: FIELD_TYPES.NUMBER,
    label: i18n.translate('xpack.ingestPipelines.form.versionFieldLabel', {
      defaultMessage: 'Version (optional)',
    }),
    formatters: [toInt],
  },
  _meta: {
    label: i18n.translate('xpack.ingestPipelines.form.metaFieldLabel', {
      defaultMessage: '_meta field data (optional)',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.form.metaHelpText', {
      defaultMessage: 'Use JSON format',
    }),
    serializer: (value) => {
      const result = parseJson(value);
      // If an empty object was passed, strip out this value entirely.
      if (!Object.keys(result).length) {
        return undefined;
      }
      return result;
    },
    deserializer: stringifyJson,
    validations: [
      {
        validator: isJsonField(
          i18n.translate('xpack.ingestPipelines.form.validation.metaJsonError', {
            defaultMessage: 'The input is not valid.',
          }),
          { allowEmptyString: true }
        ),
      },
    ],
  },
};
