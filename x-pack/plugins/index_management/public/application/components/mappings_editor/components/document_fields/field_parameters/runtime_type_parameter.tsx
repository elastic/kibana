/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiComboBox, EuiSpacer } from '@elastic/eui';

import { UseField } from '../../../shared_imports';
import { DataType, ComboBoxOption } from '../../../types';
import { getFieldConfig } from '../../../lib';
import { RUNTIME_FIELD_OPTIONS, TYPE_DEFINITION } from '../../../constants';
import { FieldDescriptionSection } from '../fields/edit_field';

export const RuntimeTypeParameter = () => {
  return (
    <UseField path="runtime_type" config={getFieldConfig('runtime_type')}>
      {(runtimeTypeField) => {
        const { label, value, setValue } = runtimeTypeField;
        const typeDefinition = TYPE_DEFINITION[(value as ComboBoxOption[])[0]!.value as DataType];

        return (
          <>
            <EuiFormRow label={label} fullWidth>
              <EuiComboBox
                placeholder={i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.runtimeTyeField.placeholderLabel',
                  {
                    defaultMessage: 'Select a type',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                options={RUNTIME_FIELD_OPTIONS}
                selectedOptions={value as ComboBoxOption[]}
                onChange={setValue}
                isClearable={false}
                fullWidth
              />
            </EuiFormRow>

            {/* Field description */}
            {typeDefinition && (
              <>
                <FieldDescriptionSection isMultiField={false}>
                  {typeDefinition.description?.() as JSX.Element}
                </FieldDescriptionSection>

                <EuiSpacer size="l" />
              </>
            )}
          </>
        );
      }}
    </UseField>
  );
};
