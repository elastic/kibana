/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FIELD_TYPES, UseField, ToggleField } from '../../../../../../../shared_imports';

import { FieldsConfig } from '../shared';

export const fieldsConfig: FieldsConfig = {
  ignore_missing: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    serializer: (v) => (v === false ? undefined : v),
    deserializer: (v) => (typeof v === 'boolean' ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.commonFields.ignoreMissingFieldLabel',
      {
        defaultMessage: 'Ignore missing',
      }
    ),
  },
};

export const IgnoreMissingField = () => (
  <UseField
    config={fieldsConfig.ignore_missing}
    component={ToggleField}
    path="fields.ignore_missing"
  />
);
