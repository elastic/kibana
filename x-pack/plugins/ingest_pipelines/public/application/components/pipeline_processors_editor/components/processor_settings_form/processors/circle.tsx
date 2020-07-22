/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  RadioGroupField,
  NumericField,
} from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldNameField } from './common_fields/field_name_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  target_field: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.circleForm.targetFieldLabel', {
      defaultMessage: 'Target field',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.circleForm.targetFieldHelpText',
      {
        defaultMessage: 'By default field is updated in-place.',
      }
    ),
  },
  ignore_missing: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: (v) => (typeof v === 'boolean' ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.circleForm.ignoreMissingFieldLabel',
      {
        defaultMessage: 'Ignore missing',
      }
    ),
  },
  error_distance: {
    type: FIELD_TYPES.NUMBER,
    deserializer: (v) => (typeof v === 'number' && !isNaN(v) ? v : 1.0),
    serializer: Number,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.circleForm.errorDistanceFieldLabel',
      {
        defaultMessage: 'Error distance',
      }
    ),
    validations: [
      {
        validator: ({ value }) => {
          return isNaN(Number(value))
            ? {
                message: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.circleForm.errorDistanceError',
                  {
                    defaultMessage: 'An error distance value is required.',
                  }
                ),
              }
            : undefined;
        },
      },
    ],
  },
  shape_type: {
    type: FIELD_TYPES.RADIO_GROUP,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeFieldLabel', {
      defaultMessage: 'Shape type',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeRequiredError', {
            defaultMessage: 'A shape type value is required.',
          })
        ),
      },
    ],
  },
};

export const Circle: FunctionComponent = () => {
  return (
    <>
      <FieldNameField />

      <UseField
        componentProps={{
          euiFieldProps: {
            options: [
              {
                id: 'shape',
                label: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeShape',
                  { defaultMessage: 'Shape' }
                ),
              },
              {
                id: 'geo_shape',
                label: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeGeoShape',
                  { defaultMessage: 'Geo-shape' }
                ),
              },
            ],
          },
        }}
        config={fieldsConfig.shape_type}
        component={RadioGroupField}
        path="fields.shape_type"
      />

      <UseField
        config={fieldsConfig.error_distance}
        component={NumericField}
        path="fields.error_distance"
      />

      <UseField config={fieldsConfig.target_field} component={Field} path="fields.target_field" />

      <IgnoreMissingField />
    </>
  );
};
