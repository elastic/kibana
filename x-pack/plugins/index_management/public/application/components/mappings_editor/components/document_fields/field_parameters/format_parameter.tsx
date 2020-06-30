/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { EuiComboBox, EuiFormRow, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EditFieldFormRow } from '../fields/edit_field';
import { UseField } from '../../../shared_imports';
import { ALL_DATE_FORMAT_OPTIONS } from '../../../constants';
import { ComboBoxOption } from '../../../types';
import { getFieldConfig } from '../../../lib';
import { documentationService } from '../../../../../services/documentation';

interface Props {
  defaultValue: string;
  defaultToggleValue: boolean;
}

export const FormatParameter = ({ defaultValue, defaultToggleValue }: Props) => {
  const defaultValueArray =
    defaultValue !== undefined ? defaultValue.split('||').map((value) => ({ label: value })) : [];
  const defaultValuesInOptions = defaultValueArray.filter((defaultFormat) =>
    ALL_DATE_FORMAT_OPTIONS.includes(defaultFormat)
  );

  const [comboBoxOptions, setComboBoxOptions] = useState<ComboBoxOption[]>([
    ...ALL_DATE_FORMAT_OPTIONS,
    ...defaultValuesInOptions,
  ]);

  return (
    <EditFieldFormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.formatParameter.fieldTitle', {
        defaultMessage: 'Set format',
      })}
      description={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.formatParameter.fieldDescription"
          defaultMessage="The date formats to parse. Most builit-ins use {strict} date formats, where YYYY is the year, MM is the month, and DD is the day. Example: 2020/11/01."
          values={{
            strict: <EuiCode>strict</EuiCode>,
          }}
        />
      }
      docLink={{
        text: i18n.translate('xpack.idxMgmt.mappingsEditor.formatDocLinkText', {
          defaultMessage: 'Format documentation',
        }),
        href: documentationService.getFormatLink(),
      }}
      defaultToggleValue={defaultToggleValue}
    >
      <UseField path="format" config={getFieldConfig('format')}>
        {(formatField) => {
          return (
            <EuiFormRow label={formatField.label} helpText={formatField.helpText} fullWidth>
              <EuiComboBox
                placeholder={i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.formatParameter.placeholderLabel',
                  {
                    defaultMessage: 'Select a format',
                  }
                )}
                options={comboBoxOptions}
                selectedOptions={formatField.value as ComboBoxOption[]}
                onChange={(value) => {
                  formatField.setValue(value);
                }}
                onCreateOption={(searchValue: string) => {
                  const newOption = {
                    label: searchValue,
                  };

                  formatField.setValue([...(formatField.value as ComboBoxOption[]), newOption]);
                  setComboBoxOptions([...comboBoxOptions, newOption]);
                }}
                fullWidth
              />
            </EuiFormRow>
          );
        }}
      </UseField>
    </EditFieldFormRow>
  );
};
