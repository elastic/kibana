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
  ToggleField,
  NumericField,
  SelectField,
} from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldsConfig, to } from './shared';

const { emptyField, numberSmallerThanField, numberGreaterThanField } = fieldValidators;

const maxMatchesValidators = {
  max: numberSmallerThanField({
    than: 128,
    allowEquality: true,
    message: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.enrichForm.maxMatchesMaxNumberError',
      { defaultMessage: 'This number must be less than 128.' }
    ),
  }),
  min: numberGreaterThanField({
    than: 0,
    allowEquality: false,
    message: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.enrichForm.maxMatchesMinNumberError',
      { defaultMessage: 'This number must be greater than 0.' }
    ),
  }),
};

const fieldsConfig: FieldsConfig = {
  policy_name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.enrichForm.policyNameFieldLabel', {
      defaultMessage: 'Policy name',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.enrichForm.policyNameHelpText', {
      defaultMessage: 'The name of the enrich policy to use.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.enrichForm.policyNameRequiredError',
            {
              defaultMessage: 'A field value is required.',
            }
          )
        ),
      },
    ],
  },

  target_field: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.enrichForm.targetFieldLabel', {
      defaultMessage: 'Target field',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.enrichForm.targetFieldHelpText',
      {
        defaultMessage: 'Field added to incoming documents to contain enrich data.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.enrichForm.targetFieldRequiredError',
            {
              defaultMessage: 'A target field value is required.',
            }
          )
        ),
      },
    ],
  },

  override: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
    serializer: (v) => (v === true ? undefined : v),
    deserializer: to.booleanOrUndef,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.enrichForm.overrideFieldLabel', {
      defaultMessage: 'Override',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.enrichForm.overrideFieldHelpText',
      {
        defaultMessage:
          'Whether this processor will update fields with pre-existing non-null-valued field. When set to false, such fields will not be overridden.',
      }
    ),
  },

  max_matches: {
    type: FIELD_TYPES.NUMBER,
    defaultValue: 1,
    deserializer: (v) => (typeof v === 'number' && !isNaN(v) ? v : 1),
    serializer: (v) => {
      const n = parseInt(v, 10);
      return n === 1 ? undefined : n;
    },
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.enrichForm.maxMatchesFieldLabel', {
      defaultMessage: 'Max matches',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.enrichForm.maxMatchesFieldHelpText',
      {
        defaultMessage:
          'The maximum number of matched documents to include under the configured target field. The target_field will be turned into a json array if max_matches is higher than 1, otherwise target_field will become a json object',
      }
    ),
    validations: [
      {
        validator: (v) => {
          if (v.value /* value is a string here */) {
            return maxMatchesValidators.max(v) ?? maxMatchesValidators.min(v);
          }
        },
      },
    ],
  },

  shape_relation: {
    type: FIELD_TYPES.SELECT,
    defaultValue: 'INTERSECTS',
    deserializer: String,
    serializer: (v) => (v === 'INTERSECTS' ? undefined : v),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.enrichForm.shapeRelationFieldLabel',
      {
        defaultMessage: 'Shape relation',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.enrichForm.shapeRelationFieldHelpText',
      {
        defaultMessage:
          'A spatial relation operator used to match the geo_shape of incoming documents to documents in the enrich index. This option is only used for geo_match enrich policy types.',
      }
    ),
  },
};

export const Enrich: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.enrichForm.fieldNameHelpText',
          {
            defaultMessage:
              'The field in the input document that matches the policies match_field used to retrieve the enrichment data',
          }
        )}
      />

      <UseField config={fieldsConfig.policy_name} component={Field} path="fields.policy_name" />

      <UseField config={fieldsConfig.target_field} component={Field} path="fields.target_field" />

      <UseField config={fieldsConfig.override} component={ToggleField} path="fields.override" />

      <UseField
        config={fieldsConfig.max_matches}
        component={NumericField}
        path="fields.max_matches"
      />

      <UseField
        config={fieldsConfig.shape_relation}
        component={SelectField}
        componentProps={{
          euiFieldProps: {
            options: [
              {
                value: 'INTERSECTS',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.enrichForm.intersectsOption',
                  { defaultMessage: 'Intersects' }
                ),
              },
              {
                value: 'DISJOINT',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.enrichFrom.disjointOption',
                  { defaultMessage: 'Disjoint' }
                ),
              },
              {
                value: 'WITHIN',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.enrichForm.withinOption',
                  { defaultMessage: 'Within' }
                ),
              },
              {
                value: 'CONTAINS',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.enrichForm.containsOption',
                  { defaultMessage: 'Contains' }
                ),
              },
            ],
          },
        }}
        path="fields.shape_relation"
      />

      <IgnoreMissingField />
    </>
  );
};
