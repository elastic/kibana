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
  BulkActionEditType,
  BulkActionEditPayloadTags,
} from '../../../../../../../../common/detection_engine/schemas/common/schemas';

import {
  Form,
  Field,
  getUseField,
  useFormData,
  ERROR_CODE,
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
  ValidationFunc,
} from '../../../../../../../shared_imports';

import { useParentStateForm, FormState } from './use_parent_state_form';

const CommonUseField = getUseField({ component: Field });

interface TagsFormData {
  tags: string[];
  overwrite: boolean;
}

export const schema: FormSchema<TagsFormData> = {
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

const initialFormData: TagsFormData = { tags: [], overwrite: false };

const getFormConfig = (editAction: BulkActionEditType) =>
  editAction === BulkActionEditType.add_index_patterns
    ? {
        tagsLabel: 'Add tags for selected rules',
        formTitle: 'Add tags',
      }
    : {
        tagsLabel: 'Delete tags for selected rules',
        formTitle: 'Delete tags',
      };

interface Props {
  editAction: BulkActionEditType;
  onChange: (form: FormState) => void;
  rulesCount: number;
}
const TagsFormComponent = ({ editAction, onChange, rulesCount }: Props) => {
  const formConfig = getFormConfig(editAction);

  const { form } = useParentStateForm({
    data: initialFormData,
    schema,
    onChange,
    config: {
      formTitle: formConfig.formTitle,
      prepareEditActionPayload: (formData: TagsFormData) =>
        ({
          value: formData.tags,
          type: formData.overwrite ? BulkActionEditType.set_tags : editAction,
        } as BulkActionEditPayloadTags),
    },
  });
  const [{ overwrite }] = useFormData({ form, watch: ['overwrite'] });

  return (
    <Form form={form}>
      <CommonUseField
        path="tags"
        config={{ ...schema.tags, label: formConfig.tagsLabel }}
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
          componentProps={{
            idAria: 'detectionEngineBulkEditOverwriteTags',
            'data-test-subj': 'detectionEngineBulkEditOverwriteTags',
          }}
        />
      ) : null}
      {overwrite && (
        <EuiFormRow>
          <EuiCallOut color="warning">
            You’re about to overwrite tags for {rulesCount} selected rules, press Save to apply
            changes.
          </EuiCallOut>
        </EuiFormRow>
      )}
    </Form>
  );
};

export const TagsForm = React.memo(TagsFormComponent);
TagsForm.displayName = 'TagsForm';
