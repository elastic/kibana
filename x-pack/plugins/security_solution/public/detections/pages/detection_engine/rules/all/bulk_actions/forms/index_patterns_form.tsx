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
  BulkActionEditPayloadIndexPatterns,
} from '../../../../../../../../common/detection_engine/schemas/common/schemas';

import {
  FormHook,
  Field,
  getUseField,
  useFormData,
  ERROR_CODE,
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
  ValidationFunc,
} from '../../../../../../../shared_imports';

const CommonUseField = getUseField({ component: Field });

export interface IndexPatternsFormData {
  index: string[];
  overwrite: boolean;
}

const schema: FormSchema<IndexPatternsFormData> = {
  index: {
    fieldsToValidateOnChange: ['index'],
    type: FIELD_TYPES.COMBO_BOX,
    helpText: i18n.BULK_EDIT_FLYOUT_FORM_INDEX_PATTERNS_HELP_TEXT,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          return fieldValidators.emptyField(
            i18n.BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_REQUIRED_ERROR
          )(...args);
        },
      },
    ],
  },
  overwrite: {
    type: FIELD_TYPES.CHECKBOX,
    label: i18n.BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_OVERWRITE_LABEL,
  },
};

const initialFormData: IndexPatternsFormData = { index: [], overwrite: false };

const getFormConfig = (editAction: BulkActionEditType) =>
  editAction === BulkActionEditType.add_index_patterns
    ? {
        indexLabel: i18n.BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_LABEL,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_ADD_INDEX_PATTERNS_TITLE,
      }
    : {
        indexLabel: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_INDEX_PATTERNS_LABEL,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_INDEX_PATTERNS_TITLE,
      };

interface Props {
  form: FormHook;
  rulesCount: number;
  editAction: BulkActionEditType;
}

const IndexPatternsFormComponent = ({ editAction, rulesCount, form }: Props) => {
  const formConfig = getFormConfig(editAction);

  const [{ overwrite }] = useFormData({ form, watch: ['overwrite'] });
  const { uiSettings } = useKibana().services;
  const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);

  return (
    <>
      <CommonUseField
        path="index"
        config={{ ...schema.index, label: formConfig.indexLabel }}
        componentProps={{
          idAria: 'detectionEngineBulkEditIndexPatterns',
          'data-test-subj': 'detectionEngineBulkEditIndexPatterns',
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
            idAria: 'detectionEngineBulkEditOverwriteIndexPatterns',
            'data-test-subj': 'detectionEngineBulkEditOverwriteIndexPatterns',
          }}
        />
      )}
      {overwrite && (
        <EuiFormRow>
          <EuiCallOut color="warning">
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.setIndexPatternsWarningCallout"
              defaultMessage="You’re about to overwrite index patterns for {rulesCount, plural, one {# selected rule} other {# selected rules}}, press Save to
              apply changes."
              values={{ rulesCount }}
            />
          </EuiCallOut>
        </EuiFormRow>
      )}
    </>
  );
};

export const IndexPatternsForm = React.memo(IndexPatternsFormComponent);
IndexPatternsForm.displayName = 'IndexPatternsForm';

export const indexPatternsFormDataToEditActionPayload = (
  formData: IndexPatternsFormData,
  editAction: BulkActionEditType
) =>
  ({
    value: formData.index,
    type: formData.overwrite ? BulkActionEditType.set_index_patterns : editAction,
  } as BulkActionEditPayloadIndexPatterns);

export const indexPatternsFormConfiguration = (editAction: BulkActionEditType) => ({
  Component: IndexPatternsForm,
  schema,
  formTitle: getFormConfig(editAction).formTitle,
  initialFormData,
});
