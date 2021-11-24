/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';

import { EuiLink, EuiCode } from '@elastic/eui';
import {
  FIELD_TYPES,
  fieldValidators,
  ValidationFunc,
  ValidationFuncArg,
  fieldFormatters,
  FieldConfig,
} from '../shared_imports';
import {
  AliasOption,
  DataType,
  ComboBoxOption,
  ParameterName,
  ParameterDefinition,
} from '../types';
import { documentationService } from '../../../services/documentation';
import { INDEX_DEFAULT } from './default_values';
import { TYPE_DEFINITION } from './data_types_definition';

const { toInt } = fieldFormatters;
const { emptyField, containsCharsField, numberGreaterThanField, isJsonField } = fieldValidators;

const commonErrorMessages = {
  smallerThanZero: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.parameters.validations.smallerZeroErrorMessage',
    {
      defaultMessage: 'The value must be greater or equal to 0.',
    }
  ),
  spacesNotAllowed: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.parameters.validations.spacesNotAllowedErrorMessage',
    {
      defaultMessage: 'Spaces are not allowed.',
    }
  ),
  analyzerIsRequired: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.parameters.validations.analyzerIsRequiredErrorMessage',
    {
      defaultMessage: 'Specify the custom analyzer name or choose a built-in analyzer.',
    }
  ),
};

const nullValueLabel = i18n.translate('xpack.idxMgmt.mappingsEditor.nullValueFieldLabel', {
  defaultMessage: 'Null value',
});

const nullValueValidateEmptyField = emptyField(
  i18n.translate(
    'xpack.idxMgmt.mappingsEditor.parameters.validations.nullValueIsRequiredErrorMessage',
    {
      defaultMessage: 'Null value is required.',
    }
  )
);

const mapIndexToValue = ['true', true, 'false', false];

const indexOptionsConfig = {
  label: i18n.translate('xpack.idxMgmt.mappingsEditor.indexOptionsLabel', {
    defaultMessage: 'Index options',
  }),
  helpText: () => (
    <FormattedMessage
      id="xpack.idxMgmt.mappingsEditor.indexOptionsHelpText"
      defaultMessage="Information to store in the index. {docsLink}"
      values={{
        docsLink: (
          <EuiLink href={documentationService.getIndexOptionsLink()} target="_blank">
            {i18n.translate(
              'xpack.idxMgmt.mappingsEditor.configuration.indexOptionsdDocumentationLink',
              {
                defaultMessage: 'Learn more.',
              }
            )}
          </EuiLink>
        ),
      }}
    />
  ),
  type: FIELD_TYPES.SUPER_SELECT,
};

const fielddataFrequencyFilterParam = {
  fieldConfig: { defaultValue: {} }, // Needed for "FieldParams" type
  props: {
    min_segment_size: {
      fieldConfig: {
        type: FIELD_TYPES.NUMBER,
        label: i18n.translate('xpack.idxMgmt.mappingsEditor.minSegmentSizeFieldLabel', {
          defaultMessage: 'Minimum segment size',
        }),
        defaultValue: 50,
        formatters: [toInt],
      },
    },
  },
  schema: t.record(
    t.union([t.literal('min'), t.literal('max'), t.literal('min_segment_size')]),
    t.number
  ),
};

const analyzerValidations = [
  {
    validator: emptyField(commonErrorMessages.analyzerIsRequired),
  },
  {
    validator: containsCharsField({
      chars: ' ',
      message: commonErrorMessages.spacesNotAllowed,
    }),
  },
];

/**
 * Single source of truth for the parameters a user can change on _any_ field type.
 * It is also the single source of truth for the parameters default values.
 *
 * As a consequence, if a parameter is *not* declared here, we won't be able to declare it in the Json editor.
 */
export const PARAMETERS_DEFINITION: { [key in ParameterName]: ParameterDefinition } = {
  name: {
    fieldConfig: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.nameFieldLabel', {
        defaultMessage: 'Field name',
      }),
      defaultValue: '',
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.nameIsRequiredErrorMessage',
              {
                defaultMessage: 'Give a name to the field.',
              }
            )
          ),
        },
      ],
    },
  },
  type: {
    fieldConfig: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.typeFieldLabel', {
        defaultMessage: 'Field type',
      }),
      defaultValue: 'text',
      deserializer: (fieldType: DataType | undefined) => {
        if (typeof fieldType === 'string' && Boolean(fieldType)) {
          return [
            {
              label: TYPE_DEFINITION[fieldType] ? TYPE_DEFINITION[fieldType].label : fieldType,
              value: fieldType,
            },
          ];
        }
        return [{ value: '' }];
      },
      serializer: (fieldType: ComboBoxOption[] | undefined) =>
        fieldType && fieldType.length ? fieldType[0].value : fieldType,
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.typeIsRequiredErrorMessage',
              {
                defaultMessage: 'Specify a field type.',
              }
            )
          ),
        },
      ],
    },
    schema: t.string,
  },
  store: {
    fieldConfig: {
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: false,
    },
    schema: t.boolean,
  },
  index: {
    fieldConfig: {
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: true,
    },
    schema: t.boolean,
  },
  doc_values: {
    fieldConfig: {
      defaultValue: true,
    },
    schema: t.boolean,
  },
  doc_values_binary: {
    fieldConfig: {
      defaultValue: false,
    },
    schema: t.boolean,
  },
  fielddata: {
    fieldConfig: {
      type: FIELD_TYPES.CHECKBOX,
      defaultValue: false,
    },
    schema: t.boolean,
  },
  fielddata_frequency_filter: fielddataFrequencyFilterParam,
  fielddata_frequency_filter_percentage: {
    ...fielddataFrequencyFilterParam,
    props: {
      min: {
        fieldConfig: {
          defaultValue: 0.01,
          serializer: (value: string) => (value === '' ? '' : toInt(value) / 100),
          deserializer: (value: number) => Math.round(value * 100),
        } as FieldConfig,
      },
      max: {
        fieldConfig: {
          defaultValue: 1,
          serializer: (value: string) => (value === '' ? '' : toInt(value) / 100),
          deserializer: (value: number) => Math.round(value * 100),
        } as FieldConfig,
      },
    },
  },
  fielddata_frequency_filter_absolute: {
    ...fielddataFrequencyFilterParam,
    props: {
      min: {
        fieldConfig: {
          defaultValue: 2,
          validations: [
            {
              validator: numberGreaterThanField({
                than: 1,
                message: i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.validations.fieldDataFrequency.numberGreaterThanOneErrorMessage',
                  {
                    defaultMessage: 'Value must be greater than one.',
                  }
                ),
              }),
            },
          ],
          formatters: [toInt],
        } as FieldConfig,
      },
      max: {
        fieldConfig: {
          defaultValue: 5,
          validations: [
            {
              validator: numberGreaterThanField({
                than: 1,
                message: i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.validations.fieldDataFrequency.numberGreaterThanOneErrorMessage',
                  {
                    defaultMessage: 'Value must be greater than one.',
                  }
                ),
              }),
            },
          ],
          formatters: [toInt],
        } as FieldConfig,
      },
    },
  },
  coerce: {
    fieldConfig: {
      defaultValue: true,
    },
    schema: t.boolean,
  },
  coerce_shape: {
    fieldConfig: {
      defaultValue: false,
    },
    schema: t.boolean,
  },
  ignore_malformed: {
    fieldConfig: {
      defaultValue: false,
    },
    schema: t.boolean,
  },
  null_value: {
    fieldConfig: {
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
      label: nullValueLabel,
    },
  },
  null_value_ip: {
    fieldConfig: {
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
      label: nullValueLabel,
      helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.nullValueIpHelpText', {
        defaultMessage: 'Accepts an IP address.',
      }),
    },
  },
  null_value_numeric: {
    fieldConfig: {
      defaultValue: '', // Needed for FieldParams typing
      label: nullValueLabel,
      formatters: [toInt],
      validations: [
        {
          validator: nullValueValidateEmptyField,
        },
      ],
    },
    schema: t.number,
  },
  null_value_boolean: {
    fieldConfig: {
      defaultValue: false,
      label: nullValueLabel,
      deserializer: (value: string | boolean) => mapIndexToValue.indexOf(value),
      serializer: (value: number) => mapIndexToValue[value],
    },
    schema: t.union([t.literal(true), t.literal(false), t.literal('true'), t.literal('false')]),
  },
  null_value_geo_point: {
    fieldConfig: {
      defaultValue: '', // Needed for FieldParams typing
      label: nullValueLabel,
      helpText: () => (
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.parameters.geoPointNullValueHelpText"
          defaultMessage="Geo-points can be expressed as an object, string, geohash, array or {docsLink} POINT."
          values={{
            docsLink: (
              <EuiLink href={documentationService.getWellKnownTextLink()} target="_blank">
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.wellKnownTextDocumentationLink',
                  {
                    defaultMessage: 'Well-Known Text',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      ),
      validations: [
        {
          validator: nullValueValidateEmptyField,
        },
      ],
      deserializer: (value: any) => {
        if (value === '') {
          return value;
        }
        return JSON.stringify(value);
      },
      serializer: (value: string) => {
        try {
          return JSON.parse(value);
        } catch (error) {
          // swallow error and return non-parsed value;
          return value;
        }
      },
    },
    schema: t.any,
  },
  null_value_point: {
    fieldConfig: {
      defaultValue: '',
      label: nullValueLabel,
      helpText: () => (
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.parameters.pointNullValueHelpText"
          defaultMessage="Points can be expressed as an object, string, array or {docsLink} POINT."
          values={{
            docsLink: (
              <EuiLink href={documentationService.getWellKnownTextLink()} target="_blank">
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.pointWellKnownTextDocumentationLink',
                  {
                    defaultMessage: 'Well-Known Text',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      ),
      validations: [
        {
          validator: nullValueValidateEmptyField,
        },
      ],
      deserializer: (value: any) => {
        if (value === '') {
          return value;
        }
        return JSON.stringify(value);
      },
      serializer: (value: string) => {
        try {
          return JSON.parse(value);
        } catch (error) {
          // swallow error and return non-parsed value;
          return value;
        }
      },
    },
    schema: t.any,
  },
  copy_to: {
    fieldConfig: {
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.copyToLabel', {
        defaultMessage: 'Group field name',
      }),
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.copyToIsRequiredErrorMessage',
              {
                defaultMessage: 'Group field name is required.',
              }
            )
          ),
        },
      ],
    },
    schema: t.string,
  },
  value: {
    fieldConfig: {
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.valueLabel', {
        defaultMessage: 'Value',
      }),
    },
    schema: t.string,
  },
  meta: {
    fieldConfig: {
      defaultValue: '',
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.metaLabel', {
        defaultMessage: 'Metadata',
      }),
      helpText: (
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.parameters.metaHelpText"
          defaultMessage="Use JSON format: {code}"
          values={{
            code: <EuiCode>{JSON.stringify({ arbitrary_key: 'anything_goes' })}</EuiCode>,
          }}
        />
      ),
      validations: [
        {
          validator: isJsonField(
            i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.metaFieldEditorJsonError', {
              defaultMessage: 'Invalid JSON.',
            }),
            { allowEmptyString: true }
          ),
        },
        {
          validator: ({ value }: ValidationFuncArg<any, string>) => {
            if (typeof value !== 'string' || value.trim() === '') {
              return;
            }

            const json = JSON.parse(value);
            const valuesAreNotString = Object.values(json).some((v) => typeof v !== 'string');

            if (Array.isArray(json)) {
              return {
                message: i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.metaFieldEditorArraysNotAllowedError',
                  {
                    defaultMessage: 'Arrays are not allowed.',
                  }
                ),
              };
            } else if (valuesAreNotString) {
              return {
                message: i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.metaFieldEditorOnlyStringValuesAllowedError',
                  {
                    defaultMessage: 'Values must be a string.',
                  }
                ),
              };
            }
          },
        },
      ],
      deserializer: (value: any) => {
        if (value === '') {
          return value;
        }
        return JSON.stringify(value, null, 2);
      },
      serializer: (value: string) => {
        // Strip out empty strings
        if (value.trim() === '') {
          return undefined;
        }

        try {
          const parsed = JSON.parse(value);
          // If an empty object was passed, strip out this value entirely.
          if (!Object.keys(parsed).length) {
            return undefined;
          }
          return parsed;
        } catch (error) {
          // swallow error and return non-parsed value;
          return value;
        }
      },
    },
    schema: t.any,
  },
  max_input_length: {
    fieldConfig: {
      defaultValue: 50,
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.maxInputLengthLabel', {
        defaultMessage: 'Max input length',
      }),
      formatters: [toInt],
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.maxInputLengthFieldRequiredErrorMessage',
              {
                defaultMessage: 'Specify a max input length.',
              }
            )
          ),
        },
      ],
    },
    schema: t.number,
  },
  locale: {
    fieldConfig: {
      defaultValue: 'ROOT',
      type: FIELD_TYPES.TEXT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.localeLabel', {
        defaultMessage: 'Locale',
      }),
      helpText: () => (
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.parameters.localeHelpText"
          defaultMessage="Separate the language, country, and variant, use {hyphen} or {underscore}. A maximum of 2 separators is allowed. Example: {locale}."
          values={{
            locale: <EuiCode>en-US</EuiCode>,
            hyphen: <EuiCode>-</EuiCode>,
            underscore: <EuiCode>_</EuiCode>,
          }}
        />
      ),
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.localeFieldRequiredErrorMessage',
              {
                defaultMessage: 'Specify a locale.',
              }
            )
          ),
        },
      ],
    },
    schema: t.string,
  },
  orientation: {
    fieldConfig: {
      defaultValue: 'ccw',
      type: FIELD_TYPES.SUPER_SELECT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.orientationLabel', {
        defaultMessage: 'Orientation',
      }),
    },
    schema: t.string,
  },
  boost: {
    fieldConfig: {
      defaultValue: 1.0,
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.boostLabel', {
        defaultMessage: 'Boost level',
      }),
      formatters: [toInt],
      validations: [
        {
          validator: ({ value }: ValidationFuncArg<any, number>) => {
            if (value < 0) {
              return { message: commonErrorMessages.smallerThanZero };
            }
          },
        },
      ],
    } as FieldConfig,
    schema: t.number,
  },
  scaling_factor: {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.scalingFactorFieldTitle', {
      defaultMessage: 'Scaling factor',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.parameters.scalingFactorFieldDescription',
      {
        defaultMessage:
          'Values will be multiplied by this factor at index time and rounded to the closest long value. High factor values improve accuracy, but also increase space requirements.',
      }
    ),
    fieldConfig: {
      defaultValue: '',
      type: FIELD_TYPES.NUMBER,
      deserializer: (value: string | number) => (value === '' ? value : +value),
      formatters: [toInt],
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.scalingFactorLabel', {
        defaultMessage: 'Scaling factor',
      }),
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.scalingFactorIsRequiredErrorMessage',
              {
                defaultMessage: 'A scaling factor is required.',
              }
            )
          ),
        },
        {
          validator: ({ value }: ValidationFuncArg<any, number>) => {
            if (value <= 0) {
              return {
                message: i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.validations.greaterThanZeroErrorMessage',
                  {
                    defaultMessage: 'The scaling factor must be greater than 0.',
                  }
                ),
              };
            }
          },
        },
      ],
      helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.scalingFactorHelpText', {
        defaultMessage: 'Value must be greater than 0.',
      }),
    } as FieldConfig,
    schema: t.number,
  },
  dynamic: {
    fieldConfig: {
      defaultValue: true,
    },
    schema: t.union([t.boolean, t.literal('strict')]),
  },
  dynamic_toggle: {
    fieldConfig: {
      defaultValue: true,
    },
  },
  dynamic_strict: {
    fieldConfig: {
      defaultValue: false,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicStrictParameter.fieldTitle', {
        defaultMessage: 'Throw an exception when the object contains an unmapped property',
      }),
      helpText: i18n.translate(
        'xpack.idxMgmt.mappingsEditor.dynamicStrictParameter.fieldHelpText',
        {
          defaultMessage:
            'By default, unmapped properties will be silently ignored when dynamic mapping is disabled. Optionally, you can choose to throw an exception when an object contains an unmapped property.',
        }
      ),
    },
  },
  enabled: {
    fieldConfig: {
      defaultValue: true,
    },
    schema: t.boolean,
  },
  format: {
    fieldConfig: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.formatFieldLabel', {
        defaultMessage: 'Format',
      }),
      defaultValue: 'strict_date_optional_time||epoch_millis',
      serializer: (format: ComboBoxOption[]): string | undefined =>
        format.length ? format.map(({ label }) => label).join('||') : undefined,
      deserializer: (formats: string): ComboBoxOption[] | undefined =>
        formats.split('||').map((format) => ({ label: format })),
      helpText: (
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.formatHelpText"
          defaultMessage="Specify custom formats using {dateSyntax} syntax."
          values={{
            dateSyntax: <EuiCode>yyyy/MM/dd</EuiCode>,
          }}
        />
      ),
    },
    schema: t.string,
  },
  analyzer: {
    fieldConfig: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.analyzerFieldLabel', {
        defaultMessage: 'Analyzer',
      }),
      defaultValue: INDEX_DEFAULT,
      validations: analyzerValidations,
    },
    schema: t.string,
  },
  search_analyzer: {
    fieldConfig: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.searchAnalyzerFieldLabel', {
        defaultMessage: 'Search analyzer',
      }),
      defaultValue: INDEX_DEFAULT,
      validations: analyzerValidations,
    },
    schema: t.string,
  },
  search_quote_analyzer: {
    fieldConfig: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.searchQuoteAnalyzerFieldLabel', {
        defaultMessage: 'Search quote analyzer',
      }),
      defaultValue: INDEX_DEFAULT,
      validations: analyzerValidations,
    },
    schema: t.string,
  },
  normalizer: {
    fieldConfig: {
      label: 'Normalizer',
      defaultValue: '',
      type: FIELD_TYPES.TEXT,
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.normalizerIsRequiredErrorMessage',
              {
                defaultMessage: 'Normalizer name is required.',
              }
            )
          ),
        },
        {
          validator: containsCharsField({
            chars: ' ',
            message: commonErrorMessages.spacesNotAllowed,
          }),
        },
      ],
      helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.normalizerHelpText', {
        defaultMessage: `The name of a normalizer defined in the index's settings.`,
      }),
    },
    schema: t.string,
  },
  index_options: {
    fieldConfig: {
      ...indexOptionsConfig,
      defaultValue: 'positions',
    },
    schema: t.string,
  },
  index_options_keyword: {
    fieldConfig: {
      ...indexOptionsConfig,
      defaultValue: 'docs',
    },
    schema: t.string,
  },
  index_options_flattened: {
    fieldConfig: {
      ...indexOptionsConfig,
      defaultValue: 'docs',
    },
    schema: t.string,
  },
  eager_global_ordinals: {
    fieldConfig: {
      defaultValue: false,
    },
    schema: t.boolean,
  },
  eager_global_ordinals_join: {
    fieldConfig: {
      defaultValue: true,
    },
  },
  index_phrases: {
    fieldConfig: {
      defaultValue: false,
    },
    schema: t.boolean,
  },
  positive_score_impact: {
    fieldConfig: {
      defaultValue: true,
    },
    schema: t.boolean,
  },
  preserve_separators: {
    fieldConfig: {
      defaultValue: true,
    },
    schema: t.boolean,
  },
  preserve_position_increments: {
    fieldConfig: {
      defaultValue: true,
    },
    schema: t.boolean,
  },
  ignore_z_value: {
    fieldConfig: {
      defaultValue: true,
    },
    schema: t.boolean,
  },
  points_only: {
    fieldConfig: {
      defaultValue: false,
    },
    schema: t.boolean,
  },
  norms: {
    fieldConfig: {
      defaultValue: true,
    },
    schema: t.boolean,
  },
  norms_keyword: {
    fieldConfig: {
      defaultValue: false,
    },
    schema: t.boolean,
  },
  term_vector: {
    fieldConfig: {
      type: FIELD_TYPES.SUPER_SELECT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.termVectorLabel', {
        defaultMessage: 'Set term vector',
      }),
      defaultValue: 'no',
    },
    schema: t.string,
  },
  path: {
    fieldConfig: {
      type: FIELD_TYPES.COMBO_BOX,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.pathLabel', {
        defaultMessage: 'Field path',
      }),
      helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.pathHelpText', {
        defaultMessage: 'The absolute path from the root to the target field.',
      }),
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.pathIsRequiredErrorMessage',
              {
                defaultMessage: 'Select a field to point the alias to.',
              }
            )
          ),
        },
      ],
      serializer: (value) => (value.length === 0 ? '' : value[0].id),
    } as FieldConfig<string, {}, AliasOption[]>,
    targetTypesNotAllowed: ['object', 'nested', 'alias'] as DataType[],
    schema: t.string,
  },
  position_increment_gap: {
    fieldConfig: {
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.positionIncrementGapLabel', {
        defaultMessage: 'Position increment gap',
      }),
      defaultValue: 100,
      formatters: [toInt],
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.positionIncrementGapIsRequiredErrorMessage',
              {
                defaultMessage: 'Set a position increment gap value',
              }
            )
          ),
        },
        {
          validator: (({ value }: ValidationFuncArg<any, number>) => {
            if (value < 0) {
              return { message: commonErrorMessages.smallerThanZero };
            }
          }) as ValidationFunc,
        },
      ],
    },
    schema: t.number,
  },
  index_prefixes: {
    fieldConfig: { defaultValue: {} }, // Needed for FieldParams typing
    props: {
      min_chars: {
        fieldConfig: {
          type: FIELD_TYPES.NUMBER,
          defaultValue: 2,
          serializer: (value: string) => (value === '' ? '' : toInt(value)),
        } as FieldConfig,
      },
      max_chars: {
        fieldConfig: {
          type: FIELD_TYPES.NUMBER,
          defaultValue: 5,
          serializer: (value: string) => (value === '' ? '' : toInt(value)),
        } as FieldConfig,
      },
    },
    schema: t.partial({
      min_chars: t.number,
      max_chars: t.number,
    }),
  },
  similarity: {
    fieldConfig: {
      defaultValue: 'BM25',
      type: FIELD_TYPES.SUPER_SELECT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.similarityLabel', {
        defaultMessage: 'Similarity algorithm',
      }),
    },
    schema: t.string,
  },
  split_queries_on_whitespace: {
    fieldConfig: {
      defaultValue: false,
    },
    schema: t.boolean,
  },
  ignore_above: {
    fieldConfig: {
      // Protects against Lucene’s term byte-length limit of 32766. UTF-8 characters may occupy at
      // most 4 bytes, so 32766 / 4 = 8191 characters.
      defaultValue: 8191,
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.ignoreAboveFieldLabel', {
        defaultMessage: 'Character length limit',
      }),
      formatters: [toInt],
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.ignoreAboveIsRequiredErrorMessage',
              {
                defaultMessage: 'Character length limit is required.',
              }
            )
          ),
        },
        {
          validator: (({ value }: ValidationFuncArg<any, number>) => {
            if ((value as number) < 0) {
              return { message: commonErrorMessages.smallerThanZero };
            }
          }) as ValidationFunc,
        },
      ],
    },
    schema: t.number,
  },
  enable_position_increments: {
    fieldConfig: {
      defaultValue: true,
    },
    schema: t.boolean,
  },
  depth_limit: {
    fieldConfig: {
      defaultValue: 20,
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.depthLimitFieldLabel', {
        defaultMessage: 'Nested object depth limit',
      }),
      formatters: [toInt],
      validations: [
        {
          validator: (({ value }: ValidationFuncArg<any, number>) => {
            if ((value as number) < 0) {
              return { message: commonErrorMessages.smallerThanZero };
            }
          }) as ValidationFunc,
        },
      ],
    },
    schema: t.number,
  },
  dims: {
    fieldConfig: {
      defaultValue: '',
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.dimsFieldLabel', {
        defaultMessage: 'Dimensions',
      }),
      helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.dimsHelpTextDescription', {
        defaultMessage: 'The number of dimensions in the vector.',
      }),
      formatters: [toInt],
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.dimsIsRequiredErrorMessage',
              {
                defaultMessage: 'Specify a dimension.',
              }
            )
          ),
        },
      ],
    },
    schema: t.string,
  },
  relations: {
    fieldConfig: {
      defaultValue: [] as any, // Needed for FieldParams typing
    },
    schema: t.record(t.string, t.union([t.string, t.array(t.string)])),
  },
  max_shingle_size: {
    fieldConfig: {
      type: FIELD_TYPES.SELECT,
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.largestShingleSizeFieldLabel', {
        defaultMessage: 'Max shingle size',
      }),
      defaultValue: 3,
      formatters: [toInt],
    },
    schema: t.union([t.literal(2), t.literal(3), t.literal(4)]),
  },
};
