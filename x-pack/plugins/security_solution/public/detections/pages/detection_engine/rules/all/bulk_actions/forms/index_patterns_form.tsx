/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { EuiFormRow, EuiCallOut } from '@elastic/eui';
import * as i18n from '../../../translations';

import { DEFAULT_INDEX_KEY } from '../../../../../../../../common/constants';
import { useKibana } from '../../../../../../../common/lib/kibana';

import {
  BulkAction,
  BulkActionEditType,
  BulkActionEditPayload,
  BulkActionEditPayloadIndexPatterns,
} from '../../../../../../../../common/detection_engine/schemas/common/schemas';

import { useParentStateForm, FormState } from './use_parent_state_form';

import {
  Form,
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

interface IndexPatternsFormData {
  index: string[];
  overwrite: boolean;
}

export const schema: FormSchema<IndexPatternsFormData> = {
  index: {
    fieldsToValidateOnChange: ['index'],
    type: FIELD_TYPES.COMBO_BOX,
    helpText:
      'Add index pattern of Elasticsearch indices where you would like update rules to run.',
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          return fieldValidators.emptyField('A minimum of one index pattern is required.')(...args);
        },
      },
    ],
  },
  overwrite: {
    type: FIELD_TYPES.CHECKBOX,
    label: 'Overwrite all selected rules index patterns',
  },
};

const initialFormData: IndexPatternsFormData = { index: [], overwrite: false };

const getFormConfig = (editAction: BulkActionEditType) =>
  editAction === BulkActionEditType.add_index_patterns
    ? {
        indexLabel: 'Add index patterns for selected rules',
        formTitle: 'Add index patterns',
      }
    : {
        indexLabel: 'Delete index patterns for selected rules',
        formTitle: 'Delete index patterns',
      };

interface Props {
  rulesCount: number;
  editAction: BulkActionEditType;
  onChange: (form: FormState) => void;
}

const IndexPatternsFormComponent = ({ editAction, rulesCount, onChange }: Props) => {
  const formConfig = getFormConfig(editAction);

  const { form } = useParentStateForm({
    data: initialFormData,
    schema,
    onChange,
    config: {
      formTitle: formConfig.formTitle,
      prepareEditActionPayload: (formData: IndexPatternsFormData) =>
        ({
          value: formData.index,
          type: formData.overwrite ? BulkActionEditType.set_index_patterns : editAction,
        } as BulkActionEditPayloadIndexPatterns),
    },
  });

  const [{ overwrite }] = useFormData({ form, watch: ['overwrite'] });
  const { uiSettings } = useKibana().services;
  const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);

  return (
    <Form form={form}>
      <CommonUseField
        path="index"
        config={{ ...schema.index, label: formConfig.indexLabel }}
        componentProps={{
          idAria: 'detectionEngineBulkEditIndices',
          'data-test-subj': 'detectionEngineBulkEditIndices',
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
            idAria: 'detectionEngineBulkEditOverwriteIndices',
            'data-test-subj': 'detectionEngineBulkEditOverwriteIndices',
          }}
        />
      )}
      {overwrite && (
        <EuiFormRow>
          <EuiCallOut color="warning">
            <p>
              You’re about to overwrite index patterns for {rulesCount} selected rules, press Save
              to apply changes.
            </p>
          </EuiCallOut>
        </EuiFormRow>
      )}
    </Form>
  );
};

export const IndexPatternsForm = React.memo(IndexPatternsFormComponent);
IndexPatternsForm.displayName = 'IndexPatternsForm';
