/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableRowCellCheckbox,
  EuiCheckbox,
  EuiFieldNumber,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SIZE_FIELD_MINIMUM, SIZE_FIELD_MAXIMUM } from '../constants';
import { ResultSettingsLogic } from '../result_settings_logic';
import { FieldResultSetting } from '../types';

const updateOrClearSizeForField = (
  fieldName: string,
  fieldValue: number,
  updateAction: (fieldName: string, size: number) => void,
  clearAction: (fieldName: string) => void
) => {
  if (typeof fieldValue === 'number' && !isNaN(fieldValue)) {
    updateAction(fieldName, fieldValue);
  } else {
    clearAction(fieldName);
  }
};

export const ResultSettingsTextFieldsBody: React.FC = () => {
  const { textResultFields } = useValues(ResultSettingsLogic);
  const {
    toggleRawForField,
    updateRawSizeForField,
    clearRawSizeForField,
    // toggleSnippetForField,
    // updateSnippetSizeForField,
    // clearSnippetSizeForField,
    // toggleSnippetFallbackForField,
  } = useActions(ResultSettingsLogic);

  const resultSettingsArray: Array<[string, Partial<FieldResultSetting>]> = useMemo(() => {
    return Object.entries(textResultFields).sort(([aFieldName], [bFieldName]) =>
      aFieldName > bFieldName ? 1 : -1
    );
  }, [textResultFields]);

  return (
    <EuiTableBody>
      {resultSettingsArray.map(([fieldName, fieldSettings]) => (
        <EuiTableRow key={fieldName}>
          <EuiTableRowCell
            data-test-subj="ResultSettingFieldName"
            className="TODO c-stui-engine-schema-field__name"
          >
            {fieldName}
          </EuiTableRowCell>
          <EuiTableRowCellCheckbox>
            <EuiCheckbox
              data-test-subj="ResultSettingRawCheckBox"
              id={`${fieldName}-raw}`}
              checked={!!fieldSettings.raw}
              onChange={(_) => {
                toggleRawForField(fieldName);
              }}
            />
          </EuiTableRowCellCheckbox>
          <EuiTableRowCell align="center">
            <EuiFieldNumber
              data-test-subj="ResultSettingRawMaxSize"
              value={typeof fieldSettings.rawSize === 'number' ? fieldSettings.rawSize : ''}
              placeholder={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.resultSettings.rawSize.textFieldPlaceholder',
                { defaultMessage: 'No limit' }
              )}
              disabled={!fieldSettings.raw}
              min={SIZE_FIELD_MINIMUM}
              max={SIZE_FIELD_MAXIMUM}
              onChange={(e) => {
                const fieldValue = parseInt(e.target.value, 10);
                updateOrClearSizeForField(
                  fieldName,
                  fieldValue,
                  updateRawSizeForField,
                  clearRawSizeForField
                );
              }}
              onBlur={(e) => {
                const value = parseInt(e.target.value, 10);
                const fieldValue = Math.min(
                  SIZE_FIELD_MAXIMUM,
                  Math.max(SIZE_FIELD_MINIMUM, isNaN(value) ? 0 : value)
                );
                updateOrClearSizeForField(
                  fieldName,
                  fieldValue,
                  updateRawSizeForField,
                  clearRawSizeForField
                );
              }}
              size={4}
            />
          </EuiTableRowCell>
          {/* <EuiTableRowCellCheckbox>
            <EuiCheckbox
              id={`${fieldName}-snippet}`}
              checked={!!fieldSettings.snippet}
              onChange={(_) => {
                toggleSnippetForField(fieldName);
              }}
            />
          </EuiTableRowCellCheckbox>
          <EuiTableRowCellCheckbox>
            <EuiCheckbox
              id={`${fieldName}-snippetFallback}`}
              checked={fieldSettings.snippetFallback}
              disabled={!fieldSettings.snippet}
              onChange={(_) => {
                toggleSnippetFallbackForField(fieldName);
              }}
            />
          </EuiTableRowCellCheckbox>
          <EuiTableRowCell align="center">
            <EuiFieldNumber
              value={typeof fieldSettings.snippetSize === 'number' ? fieldSettings.snippetSize : ''}
              disabled={!fieldSettings.snippet}
              placeholder="100"
              min={SIZE_FIELD_MINIMUM}
              max={SIZE_FIELD_MAXIMUM}
              onChange={(e) => {
                const fieldValue = parseInt(e.target.value, 10);
                updateOrClearSizeForField(
                  fieldName,
                  fieldValue,
                  updateSnippetSizeForField,
                  clearSnippetSizeForField
                );
              }}
              onBlur={(e) => {
                const fieldValue = Math.min(
                  SIZE_FIELD_MAXIMUM,
                  Math.max(SIZE_FIELD_MINIMUM, parseInt(e.target.value, 10))
                );
                updateOrClearSizeForField(
                  fieldName,
                  fieldValue,
                  updateSnippetSizeForField,
                  clearSnippetSizeForField
                );
              }}
              size={4}
            />
          </EuiTableRowCell> */}
        </EuiTableRow>
      ))}
    </EuiTableBody>
  );
};
