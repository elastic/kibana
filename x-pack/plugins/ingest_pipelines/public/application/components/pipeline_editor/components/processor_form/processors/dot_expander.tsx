/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { FIELD_TYPES, UseField, Field, ToggleField } from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';

import { FieldsConfig, from, to } from './shared';

const fieldsConfig: FieldsConfig = {
  path: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dotExpanderForm.pathFieldLabel', {
      defaultMessage: 'Path',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.dotExpanderForm.pathHelpText', {
      defaultMessage:
        'Output field. Only required if the field to expand is part another object field.',
    }),
  },

  /* Optional fields config */
  override: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dotExpanderForm.overrideFieldLabel',
      {
        defaultMessage: 'Override',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dotExpanderForm.overrideFieldHelpText',
      {
        defaultMessage:
          'Controls the behavior when there is already an existing nested object that conflicts with the expanded field. When disabled, the processor will merge conflicts by combining the old and the new values into an array. If enabled, the value from the expanded field will overwrite the existing value.',
      }
    ),
  },
};

export const DotExpander: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.dotExpanderForm.fieldNameHelpText',
          { defaultMessage: 'Field containing dot notation.' }
        )}
        additionalValidations={[
          {
            validator: ({ value }) => {
              if (typeof value === 'string' && value.length) {
                const allowedPattern = value.includes('.') || value === '*';
                return !allowedPattern
                  ? {
                      message: i18n.translate(
                        'xpack.ingestPipelines.pipelineEditor.dotExpanderForm.fieldNameRequiresDotError',
                        {
                          defaultMessage:
                            'The field name must be an asterisk or contain a dot character.',
                        }
                      ),
                    }
                  : undefined;
              }
            },
          },
        ]}
      />

      <UseField
        data-test-subj="pathField"
        config={fieldsConfig.path}
        component={Field}
        path="fields.path"
      />

      <UseField
        data-test-subj="overrideField"
        config={fieldsConfig.override}
        component={ToggleField}
        path="fields.override"
      />
    </>
  );
};
