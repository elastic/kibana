/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { FIELD_TYPES, UseField, Field } from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldNameField } from './common_fields/field_name_field';

const fieldsConfig: FieldsConfig = {
  target_field: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.bytesForm.targetFieldLabel', {
      defaultMessage: 'Target field',
    }),
  },
};

export const Bytes: FunctionComponent = () => {
  return (
    <>
      <FieldNameField />

      <UseField config={fieldsConfig.target_field} component={Field} path="fields.target_field" />

      <IgnoreMissingField />
    </>
  );
};
