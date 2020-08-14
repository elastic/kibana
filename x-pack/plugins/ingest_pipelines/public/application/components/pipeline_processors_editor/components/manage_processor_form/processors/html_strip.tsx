/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { FIELD_TYPES, UseField, Field } from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';
import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';

const fieldsConfig: FieldsConfig = {
  /* Optional fields config */
  target_field: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.htmlStripForm.targetFieldLabel', {
      defaultMessage: 'Target field (optional)',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.htmlStripForm.targetFieldHelpText',
      {
        defaultMessage:
          'The field to assign the stripped value to. If blank the field will be updated in-place.',
      }
    ),
  },
};

export const HtmlStrip: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.htmlStripForm.fieldNameHelpText',
          { defaultMessage: 'The string-valued field to remove HTML tags from.' }
        )}
      />

      <UseField config={fieldsConfig.target_field} component={Field} path="fields.target_field" />

      <IgnoreMissingField />
    </>
  );
};
