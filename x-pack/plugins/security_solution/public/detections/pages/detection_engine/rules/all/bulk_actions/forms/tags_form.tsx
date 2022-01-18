/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

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
    helpText: i18n.BULK_EDIT_FLYOUT_FORM_TAGS_HELP_TEXT,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          return fieldValidators.emptyField(i18n.BULK_EDIT_FLYOUT_FORM_TAGS_REQUIRED_ERROR)(
            ...args
          );
        },
      },
    ],
  },
  overwrite: {
    type: FIELD_TYPES.CHECKBOX,
    label: i18n.BULK_EDIT_FLYOUT_FORM_ADD_TAGS_OVERWRITE_LABEL,
  },
};

const initialFormData: TagsFormData = { tags: [], overwrite: false };

const getFormConfig = (editAction: BulkActionEditType) =>
  editAction === BulkActionEditType.add_index_patterns
    ? {
        tagsLabel: i18n.BULK_EDIT_FLYOUT_FORM_ADD_TAGS_LABEL,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_ADD_TAGS_TITLE,
      }
    : {
        tagsLabel: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_TAGS_LABEL,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_TAGS_TITLE,
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
            placeholder: '',
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
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.setTagsWarningCallout"
              defaultMessage="You’re about to overwrite tags for {rulesCount, plural, one {# selected rule} other {# selected rules}}, press Save to
              apply changes."
              values={{ rulesCount }}
            />
          </EuiCallOut>
        </EuiFormRow>
      )}
    </Form>
  );
};

export const TagsForm = React.memo(TagsFormComponent);
TagsForm.displayName = 'TagsForm';
