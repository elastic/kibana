/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FIELD_TYPES, UseField, ToggleField } from '../../../../../../../shared_imports';

import { FieldsConfig, to } from '../shared';

export const fieldsConfig: FieldsConfig = {
  ignore_missing: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    serializer: (v) => (v === false ? undefined : v),
    deserializer: to.maybeBoolean,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.commonFields.ignoreMissingFieldLabel',
      {
        defaultMessage: 'Ignore missing',
      }
    ),
  },
};

interface Props {
  helpText?: string;
}

export const IgnoreMissingField: FunctionComponent<Props> = ({ helpText }) => (
  <UseField
    config={{ ...fieldsConfig.ignore_missing, helpText }}
    component={ToggleField}
    path="fields.ignore_missing"
  />
);
