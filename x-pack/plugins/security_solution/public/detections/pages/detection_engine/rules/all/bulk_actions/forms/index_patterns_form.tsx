/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiButton,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFormRow,
  EuiCallOut,
} from '@elastic/eui';
import * as i18n from '../../../translations';

import { DEFAULT_INDEX_KEY } from '../../../../../../../../common/constants';
import { useKibana } from '../../../../../../../common/lib/kibana';

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

interface IndexEditActions {
  index: string[];
  overwrite: boolean;
}

export const schema: FormSchema<IndexEditActions> = {
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

interface Props {
  editAction: BulkActionEditType;
  form: FormHook;
}

const IndexPatternsFormComponent = ({ editAction, form }: Props) => {
  const [{ overwrite }] = useFormData({ form, watch: ['overwrite'] });
  const { uiSettings } = useKibana().services;
  const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);

  const indexSchemaProps =
    editAction === BulkActionEditType.add_index_patterns
      ? {
          label: 'Add index patterns for selected rules',
        }
      : {
          label: 'Delete index patterns for selected rules',
        };

  return (
    <>
      <CommonUseField
        path="index"
        config={{ ...schema.index, ...indexSchemaProps }}
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
      {editAction === BulkActionEditType.add_index_patterns ? (
        <CommonUseField
          path="overwrite"
          config={schema.overwrite}
          componentProps={{
            idAria: 'detectionEngineBulkEditOverwriteIndices',
            'data-test-subj': 'detectionEngineBulkEditOverwriteIndices',
          }}
        />
      ) : null}
      {overwrite && (
        <EuiFormRow>
          <EuiCallOut color="warning">
            <p>
              You’re about to overwrite index patterns for [1] selected rules, press Save to apply
              changes.
            </p>
          </EuiCallOut>
        </EuiFormRow>
      )}
    </>
  );
};

export const IndexPatternsForm = React.memo(IndexPatternsFormComponent);
IndexPatternsForm.displayName = 'IndexPatternsForm';
