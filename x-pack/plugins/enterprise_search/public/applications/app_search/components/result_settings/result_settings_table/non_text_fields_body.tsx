/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useValues, useActions } from 'kea';

import { EuiTableRow, EuiTableRowCell, EuiCheckbox, EuiTableRowCellCheckbox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ResultSettingsLogic } from '..';
import { FieldResultSetting } from '../types';

export const NonTextFieldsBody: React.FC = () => {
  const { nonTextResultFields } = useValues(ResultSettingsLogic);
  const { toggleRawForField } = useActions(ResultSettingsLogic);

  const resultSettingsArray: Array<[string, Partial<FieldResultSetting>]> = useMemo(() => {
    return Object.entries(nonTextResultFields).sort(([aFieldName], [bFieldName]) =>
      aFieldName > bFieldName ? 1 : -1
    );
  }, [nonTextResultFields]);

  return (
    <>
      {resultSettingsArray.map(([fieldName, fieldSettings]) => (
        <EuiTableRow key={fieldName}>
          <EuiTableRowCell data-test-subj="ResultSettingFieldName">
            <code>{fieldName}</code>
          </EuiTableRowCell>
          <EuiTableRowCellCheckbox>
            <EuiCheckbox
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.rawAriaLabel',
                { defaultMessage: 'Toggle raw field' }
              )}
              data-test-subj="ResultSettingRawCheckBox"
              id={`${fieldName}-raw}`}
              checked={!!fieldSettings.raw}
              onChange={() => {
                toggleRawForField(fieldName);
              }}
            />
          </EuiTableRowCellCheckbox>
          <EuiTableRowCell colSpan={4} aria-hidden />
        </EuiTableRow>
      ))}
    </>
  );
};
