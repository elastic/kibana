/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { FieldConfig, FIELD_TYPES, UseField, Field } from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';

const fieldsConfig: Record<string, FieldConfig> = {
  path: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dotExpanderForm.pathFieldLabel', {
      defaultMessage: 'Path',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.dotExpanderForm.pathHelpText', {
      defaultMessage:
        'Output field. Only required if the field to expand is part another object field.',
    }),
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
                return !value.includes('.')
                  ? {
                      message: i18n.translate(
                        'xpack.ingestPipelines.pipelineEditor.dotExpanderForm.fieldNameRequiresDotError',
                        { defaultMessage: 'A field value requires at least one dot character.' }
                      ),
                    }
                  : undefined;
              }
            },
          },
        ]}
      />

      <UseField config={fieldsConfig.path} component={Field} path="fields.path" />
    </>
  );
};
