/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { Field, FIELD_TYPES, UseField, FieldConfig } from '../../../../../../../shared_imports';

import { FieldsConfig } from '../shared';

const fieldsConfig: FieldsConfig = {
  target_field: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.targetFieldLabel', {
      defaultMessage: 'Target field (optional)',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.commonFields.targetFieldHelpText',
      {
        defaultMessage:
          'The field to assign the joined value to. If empty, the field is updated in-place.',
      }
    ),
  },
};

type Props = Partial<FieldConfig>;

export const TARGET_FIELD_PATH = 'fields.target_field';

export const TargetField: FunctionComponent<Props> = (props) => {
  return (
    <UseField
      config={{
        ...fieldsConfig.target_field,
        ...props,
      }}
      component={Field}
      path={TARGET_FIELD_PATH}
    />
  );
};
