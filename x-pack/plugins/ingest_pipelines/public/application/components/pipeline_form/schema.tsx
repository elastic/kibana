/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCode } from '@elastic/eui';

import { FormSchema, FIELD_TYPES, fieldValidators, fieldFormatters } from '../../../shared_imports';
import { parseJson, stringifyJson } from '../../lib';

const { emptyField, isJsonField } = fieldValidators;
const { toInt } = fieldFormatters;

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
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.form.processorsFieldHelpText"
        defaultMessage="Use JSON format: {code}"
        values={{
          code: (
            <EuiCode>
              {JSON.stringify([
                {
                  set: {
                    field: 'foo',
                    value: 'bar',
                  },
                },
              ])}
            </EuiCode>
          ),
        }}
      />
    ),
    serializer: parseJson,
    deserializer: stringifyJson,
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.form.processorsRequiredError', {
            defaultMessage: 'Processors are required.',
          })
        ),
      },
      {
        validator: isJsonField(
          i18n.translate('xpack.ingestPipelines.form.processorsJsonError', {
            defaultMessage: 'The processors JSON is not valid.',
          })
        ),
      },
    ],
  },
  on_failure: {
    label: i18n.translate('xpack.ingestPipelines.form.onFailureFieldLabel', {
      defaultMessage: 'On-failure processors (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.form.onFailureFieldHelpText"
        defaultMessage="Use JSON format: {code}"
        values={{
          code: (
            <EuiCode>
              {JSON.stringify([
                {
                  set: {
                    field: '_index',
                    value: 'failed-{{ _index }}',
                  },
                },
              ])}
            </EuiCode>
          ),
        }}
      />
    ),
    serializer: value => {
      const result = parseJson(value);
      // If an empty array was passed, strip out this value entirely.
      if (!result.length) {
        return undefined;
      }
      return result;
    },
    deserializer: stringifyJson,
    validations: [
      {
        validator: validationArg => {
          if (!validationArg.value) {
            return;
          }
          return isJsonField(
            i18n.translate('xpack.ingestPipelines.form.onFailureProcessorsJsonError', {
              defaultMessage: 'The on-failure processors JSON is not valid.',
            })
          )(validationArg);
        },
      },
    ],
  },
  version: {
    type: FIELD_TYPES.NUMBER,
    label: i18n.translate('xpack.ingestPipelines.form.versionFieldLabel', {
      defaultMessage: 'Version (optional)',
    }),
    formatters: [toInt],
  },
};
