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

import { DEFAULT_INDEX_KEY } from '../../../../../../../../common/constants';
import { useKibana } from '../../../../../../../common/lib/kibana';

import {
  BulkActionEditType,
  BulkActionEditPayload,
} from '../../../../../../../../common/detection_engine/schemas/common/schemas';

import {
  Field,
  getUseField,
  useFormData,
  useForm,
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
} from '../../../../../../../shared_imports';

import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';
const CommonUseField = getUseField({ component: Field });

type IndexPatternsEditActions =
  | BulkActionEditType.add_index_patterns
  | BulkActionEditType.delete_index_patterns
  | BulkActionEditType.set_index_patterns;

interface IndexPatternsFormData {
  index: string[];
  overwrite: boolean;
}

const schema: FormSchema<IndexPatternsFormData> = {
  index: {
    fieldsToValidateOnChange: ['index'],
    type: FIELD_TYPES.COMBO_BOX,
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_REQUIRED_ERROR
        ),
      },
    ],
  },
  overwrite: {
    type: FIELD_TYPES.CHECKBOX,
    label: i18n.BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_OVERWRITE_LABEL,
  },
};

const initialFormData: IndexPatternsFormData = { index: [], overwrite: false };

const getFormConfig = (editAction: IndexPatternsEditActions) =>
  editAction === BulkActionEditType.add_index_patterns
    ? {
        indexLabel: i18n.BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_LABEL,
        indexHelpText: i18n.BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_HELP_TEXT,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_TITLE,
      }
    : {
        indexLabel: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_INDEX_PATTERNS_LABEL,
        indexHelpText: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_INDEX_PATTERNS_HELP_TEXT,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_INDEX_PATTERNS_TITLE,
      };

interface IndexPatternsFormProps {
  editAction: IndexPatternsEditActions;
  rulesCount: number;
  onClose: () => void;
  onConfirm: (bulkActionEditPayload: BulkActionEditPayload) => void;
}

const IndexPatternsFormComponent = ({
  editAction,
  rulesCount,
  onClose,
  onConfirm,
}: IndexPatternsFormProps) => {
  const { form } = useForm({
    defaultValue: initialFormData,
    schema,
  });

  const { indexHelpText, indexLabel, formTitle } = getFormConfig(editAction);

  const [{ overwrite }] = useFormData({ form, watch: ['overwrite'] });
  const { uiSettings } = useKibana().services;
  const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);

  const handleSubmit = async () => {
    const { data, isValid } = await form.submit();
    if (!isValid) {
      return;
    }

    const payload = {
      value: data.index,
      type: data.overwrite ? BulkActionEditType.set_index_patterns : editAction,
    };

    onConfirm(payload);
  };

  return (
    <BulkEditFormWrapper form={form} onClose={onClose} onSubmit={handleSubmit} title={formTitle}>
      <CommonUseField
        path="index"
        config={{ ...schema.index, label: indexLabel, helpText: indexHelpText }}
        componentProps={{
          idAria: 'bulkEditRulesIndexPatterns',
          'data-test-subj': 'bulkEditRulesIndexPatterns',
          euiFieldProps: {
            fullWidth: true,
            placeholder: '',
            noSuggestions: false,
            options: defaultPatterns.map((label) => ({ label })),
          },
        }}
      />
      {editAction === BulkActionEditType.add_index_patterns && (
        <CommonUseField
          path="overwrite"
          componentProps={{
            idAria: 'bulkEditRulesOverwriteIndexPatterns',
            'data-test-subj': 'bulkEditRulesOverwriteIndexPatterns',
          }}
        />
      )}
      {overwrite && (
        <EuiFormRow>
          <EuiCallOut color="warning" size="s" data-test-subj="bulkEditRulesIndexPatternsWarning">
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.setIndexPatternsWarningCallout"
              defaultMessage="You’re about to overwrite index patterns for {rulesCount, plural, one {# selected rule} other {# selected rules}}, press Save to
              apply changes."
              values={{ rulesCount }}
            />
          </EuiCallOut>
        </EuiFormRow>
      )}
    </BulkEditFormWrapper>
  );
};

export const IndexPatternsForm = React.memo(IndexPatternsFormComponent);
IndexPatternsForm.displayName = 'IndexPatternsForm';
