/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiDescribedFormGroup,
  EuiSpacer,
} from '@elastic/eui';

import { UseField } from '../../../shared_imports';
import { DataType } from '../../../types';
import { getFieldConfig } from '../../../lib';
import { RUNTIME_FIELD_OPTIONS, TYPE_DEFINITION } from '../../../constants';
import { EditFieldFormRow, FieldDescriptionSection } from '../fields/edit_field';

interface Props {
  stack?: boolean;
}

export const RuntimeTypeParameter = ({ stack }: Props) => {
  return (
    <UseField path="runtime_type" config={getFieldConfig('runtime_type')}>
      {(runtimeTypeField) => {
        const { label, value, setValue } = runtimeTypeField;
        const typeDefinition =
          TYPE_DEFINITION[(value as EuiComboBoxOptionOption[])[0]!.value as DataType];

        const field = (
          <>
            <EuiFormRow label={label} fullWidth>
              <EuiComboBox
                placeholder={i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.runtimeType.placeholderLabel',
                  {
                    defaultMessage: 'Select a type',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                options={RUNTIME_FIELD_OPTIONS}
                selectedOptions={value as EuiComboBoxOptionOption[]}
                onChange={setValue}
                isClearable={false}
                fullWidth
              />
            </EuiFormRow>

            <EuiSpacer size="m" />

            {/* Field description */}
            {typeDefinition && (
              <FieldDescriptionSection isMultiField={false}>
                {typeDefinition.description?.() as JSX.Element}
              </FieldDescriptionSection>
            )}
          </>
        );

        const fieldTitle = i18n.translate('xpack.idxMgmt.mappingsEditor.runtimeType.title', {
          defaultMessage: 'Emitted type',
        });

        const fieldDescription = i18n.translate(
          'xpack.idxMgmt.mappingsEditor.runtimeType.description',
          {
            defaultMessage: 'Select the type of value emitted by the runtime field.',
          }
        );

        if (stack) {
          return (
            <EditFieldFormRow title={fieldTitle} description={fieldDescription} withToggle={false}>
              {field}
            </EditFieldFormRow>
          );
        }

        return (
          <EuiDescribedFormGroup
            title={<h3>{fieldTitle}</h3>}
            description={fieldDescription}
            fullWidth={true}
          >
            {field}
          </EuiDescribedFormGroup>
        );
      }}
    </UseField>
  );
};
