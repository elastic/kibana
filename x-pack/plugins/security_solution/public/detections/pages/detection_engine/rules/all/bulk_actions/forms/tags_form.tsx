/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiCallOut } from '@elastic/eui';
import * as i18n from '../../../translations';

import {
  BulkAction,
  BulkActionEditType,
} from '../../../../../../../../common/detection_engine/schemas/common/schemas';

import {
  Field,
  getUseField,
  FormHook,
  useFormData,
  ERROR_CODE,
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
  ValidationFunc,
} from '../../../../../../../shared_imports';

const CommonUseField = getUseField({ component: Field });

interface TagsFormSchema {
  tags: string[];
  overwrite: boolean;
}

export const schema: FormSchema<TagsFormSchema> = {
  tags: {
    fieldsToValidateOnChange: ['tags'],
    type: FIELD_TYPES.COMBO_BOX,
    helpText:
      'Add one or more custom identifying tags for selected rules. Press enter after each tag to begin a new one.',
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          return fieldValidators.emptyField('A minimum of one tag is required.')(...args);
        },
      },
    ],
  },
  overwrite: {
    type: FIELD_TYPES.CHECKBOX,
    label: 'Overwrite all selected rules tags',
  },
};

interface Props {
  editAction: BulkActionEditType;
  form: FormHook;
}

const TagsFormComponent = ({ editAction, form }: Props) => {
  const [{ overwrite }] = useFormData({ form, watch: ['overwrite'] });

  const tagsSchemaProps =
    editAction === BulkActionEditType.add_tags
      ? {
          label: 'Add tags for selected rules',
        }
      : {
          label: 'Delete tags for selected rules',
        };

  return (
    <>
      <CommonUseField
        path="tags"
        config={{ ...schema.tags, ...tagsSchemaProps }}
        componentProps={{
          idAria: 'detectionEngineBulkEditTags',
          'data-test-subj': 'detectionEngineBulkEditTags',
          euiFieldProps: {
            fullWidth: true,
          },
        }}
      />
      {editAction === BulkActionEditType.add_tags ? (
        <CommonUseField
          path="overwrite"
          config={schema.overwrite}
          componentProps={{
            idAria: 'detectionEngineBulkEditOverwriteTags',
            'data-test-subj': 'detectionEngineBulkEditOverwriteTags',
          }}
        />
      ) : null}
      {overwrite && (
        <EuiFormRow>
          <EuiCallOut color="warning">
            <p>
              You’re about to overwrite tags for [1] selected rules, press Save to apply changes.
            </p>
          </EuiCallOut>
        </EuiFormRow>
      )}
    </>
  );
};

export const TagsForm = React.memo(TagsFormComponent);
TagsForm.displayName = 'TagsForm';
