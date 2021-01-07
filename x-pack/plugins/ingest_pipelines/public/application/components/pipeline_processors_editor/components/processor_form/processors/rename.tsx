/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { fieldValidators } from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';

const { emptyField } = fieldValidators;

export const Rename: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.renameForm.fieldNameHelpText',
          { defaultMessage: 'Field to rename.' }
        )}
      />

      <TargetField
        label={i18n.translate('xpack.ingestPipelines.pipelineEditor.renameForm.targetFieldLabel', {
          defaultMessage: 'Target field',
        })}
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.renameForm.targetFieldHelpText',
          { defaultMessage: 'New field name. This field cannot already exist.' }
        )}
        validations={[
          {
            validator: emptyField(
              i18n.translate(
                'xpack.ingestPipelines.pipelineEditor.renameForm.targetFieldRequiredError',
                { defaultMessage: 'A value is required.' }
              )
            ),
          },
        ]}
      />

      <IgnoreMissingField />
    </>
  );
};
