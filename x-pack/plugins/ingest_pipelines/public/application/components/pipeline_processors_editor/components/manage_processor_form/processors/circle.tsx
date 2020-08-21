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
  SelectField,
  NumericField,
} from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
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
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.circleForm.errorDistanceHelpText',
      {
        defaultMessage:
          'The difference between the resulting inscribed distance from center to side and the circle’s radius (measured in meters for geo_shape, unit-less for shape).',
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
    type: FIELD_TYPES.SELECT,
    serializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeFieldLabel', {
      defaultMessage: 'Shape type',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeFieldHelpText',
      { defaultMessage: 'Which field mapping type is to be used.' }
    ),
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
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.circleForm.fieldNameHelpText',
          { defaultMessage: 'The string-valued field to trim whitespace from.' }
        )}
      />

      <UseField
        config={fieldsConfig.error_distance}
        component={NumericField}
        path="fields.error_distance"
      />

      <UseField
        componentProps={{
          euiFieldProps: {
            options: [
              {
                value: 'shape',
                label: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeShape',
                  { defaultMessage: 'Shape' }
                ),
              },
              {
                value: 'geo_shape',
                label: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeGeoShape',
                  { defaultMessage: 'Geo-shape' }
                ),
              },
            ],
          },
        }}
        config={fieldsConfig.shape_type}
        component={SelectField}
        path="fields.shape_type"
      />

      <TargetField />

      <IgnoreMissingField />
    </>
  );
};
