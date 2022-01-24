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
  BulkActionEditPayload,
} from '../../../../../../../../common/detection_engine/schemas/common/schemas';

import {
  useForm,
  Field,
  getUseField,
  useFormData,
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
} from '../../../../../../../shared_imports';

import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';

type TagsEditActions =
  | BulkActionEditType.add_tags
  | BulkActionEditType.delete_tags
  | BulkActionEditType.set_tags;

const CommonUseField = getUseField({ component: Field });

export interface TagsFormData {
  tags: string[];
  overwrite: boolean;
}

const schema: FormSchema<TagsFormData> = {
  tags: {
    fieldsToValidateOnChange: ['tags'],
    type: FIELD_TYPES.COMBO_BOX,
    helpText: i18n.BULK_EDIT_FLYOUT_FORM_TAGS_HELP_TEXT,
    validations: [
      {
        validator: fieldValidators.emptyField(i18n.BULK_EDIT_FLYOUT_FORM_TAGS_REQUIRED_ERROR),
      },
    ],
  },
  overwrite: {
    type: FIELD_TYPES.CHECKBOX,
    label: i18n.BULK_EDIT_FLYOUT_FORM_ADD_TAGS_OVERWRITE_LABEL,
  },
};

const initialFormData: TagsFormData = { tags: [], overwrite: false };

const getFormConfig = (editAction: TagsEditActions) =>
  editAction === BulkActionEditType.add_tags
    ? {
        tagsLabel: i18n.BULK_EDIT_FLYOUT_FORM_ADD_TAGS_LABEL,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_ADD_TAGS_TITLE,
      }
    : {
        tagsLabel: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_TAGS_LABEL,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_TAGS_TITLE,
      };

interface Props {
  editAction: TagsEditActions;
  rulesCount: number;
  onClose: () => void;
  onConfirm: (bulkactionEditPayload: BulkActionEditPayload) => void;
}

const TagsFormComponent = ({ editAction, rulesCount, onClose, onConfirm }: Props) => {
  const { form } = useForm({
    defaultValue: initialFormData,
    schema,
  });
  const formConfig = getFormConfig(editAction);

  const [{ overwrite }] = useFormData({ form, watch: ['overwrite'] });

  const handleSubmit = async () => {
    const { data, isValid } = await form.submit();
    if (!isValid) {
      return;
    }

    const payload = {
      value: data.tags,
      type: data.overwrite ? BulkActionEditType.set_tags : editAction,
    };

    onConfirm(payload);
  };

  return (
    <BulkEditFormWrapper
      form={form}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={formConfig.formTitle}
    >
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
    </BulkEditFormWrapper>
  );
};

export const TagsForm = React.memo(TagsFormComponent);
TagsForm.displayName = 'TagsForm';
