/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import type { BulkActionEditPayload } from '../../../../../../../common/detection_engine/rule_management';
import { BulkActionEditType } from '../../../../../../../common/detection_engine/rule_management';
import * as i18n from '../../../../../../detections/pages/detection_engine/rules/translations';
import { caseInsensitiveSort } from '../../helpers';

import type { FormSchema } from '../../../../../../shared_imports';
import {
  Field,
  fieldValidators,
  FIELD_TYPES,
  getUseField,
  useForm,
  useFormData,
} from '../../../../../../shared_imports';

import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';
import { useTags } from '../../../../../rule_management/logic/use_tags';

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
        tagsHelpText: i18n.BULK_EDIT_FLYOUT_FORM_ADD_TAGS_HELP_TEXT,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_ADD_TAGS_TITLE,
      }
    : {
        tagsLabel: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_TAGS_LABEL,
        tagsHelpText: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_TAGS_HELP_TEXT,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_TAGS_TITLE,
      };

interface TagsFormProps {
  editAction: TagsEditActions;
  rulesCount: number;
  onClose: () => void;
  onConfirm: (bulkActionEditPayload: BulkActionEditPayload) => void;
}

const TagsFormComponent = ({ editAction, rulesCount, onClose, onConfirm }: TagsFormProps) => {
  const { data: tags = [] } = useTags();
  const { form } = useForm({
    defaultValue: initialFormData,
    schema,
  });
  const [{ overwrite }] = useFormData({ form, watch: ['overwrite'] });
  const sortedTags = useMemo(() => caseInsensitiveSort(tags), [tags]);

  const { tagsLabel, tagsHelpText, formTitle } = getFormConfig(editAction);

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
    <BulkEditFormWrapper form={form} onClose={onClose} onSubmit={handleSubmit} title={formTitle}>
      <CommonUseField
        path="tags"
        config={{ ...schema.tags, label: tagsLabel, helpText: tagsHelpText }}
        componentProps={{
          idAria: 'bulkEditRulesTags',
          'data-test-subj': 'bulkEditRulesTags',
          euiFieldProps: {
            fullWidth: true,
            placeholder: '',
            noSuggestions: false,
            options: sortedTags.map((label) => ({ label })),
          },
        }}
      />
      {editAction === BulkActionEditType.add_tags ? (
        <CommonUseField
          path="overwrite"
          componentProps={{
            idAria: 'bulkEditRulesOverwriteTags',
            'data-test-subj': 'bulkEditRulesOverwriteTags',
          }}
        />
      ) : null}
      {overwrite && (
        <EuiFormRow>
          <EuiCallOut color="warning" size="s" data-test-subj="bulkEditRulesTagsWarning">
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
