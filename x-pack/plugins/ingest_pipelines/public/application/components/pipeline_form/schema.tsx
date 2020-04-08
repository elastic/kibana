/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { FormSchema, FIELD_TYPES, fieldValidators, fieldFormatters } from '../../../shared_imports';

const { emptyField } = fieldValidators;
const { toInt } = fieldFormatters;

const stringifyJson = (json: { [key: string]: unknown }): string =>
  Array.isArray(json) ? JSON.stringify(json, null, 2) : '[\n\n]';

const parseJson = (jsonString: string) => {
  let parsedJSON;

  try {
    parsedJSON = JSON.parse(jsonString);

    if (!Array.isArray(parsedJSON)) {
      // Convert object to array
      parsedJSON = [parsedJSON];
    }
  } catch {
    parsedJSON = [];
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
            defaultMessage: 'A pipeline name is required.',
          })
        ),
      },
    ],
  },
  description: {
    type: FIELD_TYPES.TEXTAREA,
    label: i18n.translate('xpack.ingestPipelines.form.descriptionFieldLabel', {
      defaultMessage: 'Description',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.form.pipelineDescriptionRequiredError', {
            defaultMessage: 'A pipeline description is required.',
          })
        ),
      },
    ],
  },
  processors: {
    label: i18n.translate('xpack.ingestPipelines.form.processorsFieldLabel', {
      defaultMessage: 'Processors',
    }),
    serializer: processors => parseJson(processors),
    deserializer: processors => stringifyJson(processors),
  },
  onFailure: {
    label: i18n.translate('xpack.ingestPipelines.form.onFailureFieldLabel', {
      defaultMessage: 'On failure (optional)',
    }),
    // TODO: ES doesn't accept an empty array for on_failure
    serializer: onFailureProcessors => parseJson(onFailureProcessors),
    deserializer: onFailureProcessors => stringifyJson(onFailureProcessors),
  },
  version: {
    type: FIELD_TYPES.NUMBER,
    label: i18n.translate('xpack.ingestPipelines.form.versionFieldLabel', {
      defaultMessage: 'Version (optional)',
    }),
    formatters: [toInt],
  },
};
