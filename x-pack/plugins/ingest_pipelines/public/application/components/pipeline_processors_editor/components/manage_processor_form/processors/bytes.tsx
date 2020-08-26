/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';

export const Bytes: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.bytesForm.fieldNameHelpText',
          {
            defaultMessage:
              'Field to convert from a human-readable format to its value in bytes. For example, 1KB becomes 1024 bytes.',
          }
        )}
      />

      <TargetField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.convertForm.targetFieldHelpText',
          {
            defaultMessage:
              'Field to assign the converted value to. Defaults to the specified field name.',
          }
        )}
      />

      <IgnoreMissingField />
    </>
  );
};
