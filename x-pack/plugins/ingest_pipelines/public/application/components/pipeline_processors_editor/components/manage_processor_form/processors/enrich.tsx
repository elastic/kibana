/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink } from '@elastic/eui';
import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  ToggleField,
  NumericField,
  SelectField,
  ValidationConfig,
  useKibana,
} from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { TargetField } from './common_fields/target_field';

import { FieldsConfig, from, to } from './shared';

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

const targetFieldValidator: ValidationConfig = {
  validator: emptyField(
    i18n.translate('xpack.ingestPipelines.pipelineEditor.enrichForm.targetFieldRequiredError', {
      defaultMessage: 'A target field value is required.',
    })
  ),
};

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  policy_name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.enrichForm.policyNameFieldLabel', {
      defaultMessage: 'Policy name',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.enrichForm.policyNameRequiredError',
            {
              defaultMessage: 'A value is required.',
            }
          )
        ),
      },
    ],
  },

  /* Optional fields config */
  override: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
    deserializer: to.booleanOrUndef,
    serializer: from.defaultBoolToUndef,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.enrichForm.overrideFieldLabel', {
      defaultMessage: 'Override',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.enrichForm.overrideFieldHelpText',
      {
        defaultMessage: 'If enabled, the processor can overwrite pre-existing field values.',
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
      defaultMessage: 'Maximum matches (optional)',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.enrichForm.maxMatchesFieldHelpText',
      {
        defaultMessage:
          'Number of matching enrich documents to include in the target field. Accepts 1–128.',
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
        defaultMessage: 'Shape relation (optional)',
      }
    ),
  },
};

export const Enrich: FunctionComponent = () => {
  const { services } = useKibana();
  const esDocUrl = services.documentation.getEsDocsBasePath();
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.enrichForm.fieldNameHelpText',
          {
            defaultMessage:
              'Field used to match incoming documents to enrich documents. Field values are compared to the match field set in the enrich policy.',
          }
        )}
      />

      <UseField
        config={{
          ...fieldsConfig.policy_name,
          helpText: (
            <FormattedMessage
              id="xpack.ingestPipelines.pipelineEditor.enrichForm.policyNameHelpText"
              defaultMessage="Name of the {enrichPolicyLink}."
              values={{
                enrichPolicyLink: (
                  <EuiLink external target="_blank" href={esDocUrl + '/ingest-enriching-data.html'}>
                    {i18n.translate(
                      'xpack.ingestPipelines.pipelineEditor.enrichForm.policyNameHelpText.enrichPolicyLink',
                      { defaultMessage: 'enrich policy' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          ),
        }}
        component={Field}
        path="fields.policy_name"
      />

      <TargetField
        label={i18n.translate('xpack.ingestPipelines.pipelineEditor.enrichForm.targetFieldLabel', {
          defaultMessage: 'Target field',
        })}
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.enrichForm.targetFieldHelpText',
          {
            defaultMessage: 'Field used to contain enrich data.',
          }
        )}
        validations={[targetFieldValidator]}
      />

      <UseField config={fieldsConfig.override} component={ToggleField} path="fields.override" />

      <UseField
        config={fieldsConfig.max_matches}
        component={NumericField}
        path="fields.max_matches"
      />

      <UseField
        config={{
          ...fieldsConfig.shape_relation,
          helpText: (
            <FormattedMessage
              id="xpack.ingestPipelines.pipelineEditor.enrichForm.shapeRelationFieldHelpText"
              defaultMessage="Operator used to match the geo-shape of incoming documents to enrich documents. Only used for {geoMatchPolicyLink}."
              values={{
                geoMatchPolicyLink: (
                  <EuiLink
                    external
                    target="_blank"
                    href={esDocUrl + '/enrich-policy-definition.html'}
                  >
                    {i18n.translate(
                      'xpack.ingestPipelines.pipelineEditor.enrichForm.shapeRelationFieldHelpText.geoMatchPoliciesLink',
                      { defaultMessage: 'geo-match enrich policies' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          ),
        }}
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
