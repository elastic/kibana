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
  EuiCheckbox,
  EuiTableRowCellCheckbox,
} from '@elastic/eui';

import { ResultSettingsLogic } from '..';
import { FieldResultSetting } from '../types';

export const ResultSettingsNonTextFieldsBody: React.FC = () => {
  const { nonTextResultFields } = useValues(ResultSettingsLogic);
  const { toggleRawForField } = useActions(ResultSettingsLogic);

  const resultSettingsArray: Array<[string, Partial<FieldResultSetting>]> = useMemo(() => {
    return Object.entries(nonTextResultFields).sort(([aFieldName], [bFieldName]) =>
      aFieldName > bFieldName ? 1 : -1
    );
  }, [nonTextResultFields]);

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
              onChange={() => {
                toggleRawForField(fieldName);
              }}
            />
          </EuiTableRowCellCheckbox>
          <EuiTableRowCell colSpan={4} />
        </EuiTableRow>
      ))}
    </EuiTableBody>
  );
};
