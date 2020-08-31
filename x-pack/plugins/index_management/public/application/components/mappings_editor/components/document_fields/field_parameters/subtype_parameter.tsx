/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFormRow, EuiComboBox } from '@elastic/eui';

import { UseField } from '../../../shared_imports';
import { DataType, MainType, SubType, ComboBoxOption } from '../../../types';
import {
  getFieldConfig,
  filterTypesForMultiField,
  filterTypesForNonRootFields,
} from '../../../lib';
import { TYPE_DEFINITION } from '../../../constants';
import { OtherTypeNameParameter } from './other_type_name_parameter';

interface Props {
  type: MainType;
  isMultiField: boolean;
  isRootLevelField: boolean;
  defaultValueType?: DataType;
}

export const SubTypeParameter = ({
  type,
  defaultValueType,
  isMultiField,
  isRootLevelField,
}: Props) => {
  if (type === 'other') {
    return (
      <EuiFlexItem>
        <OtherTypeNameParameter />
      </EuiFlexItem>
    );
  }

  const typeDefinition = TYPE_DEFINITION[type as MainType];
  const hasSubType = typeDefinition.subTypes !== undefined;

  if (!hasSubType) {
    return null;
  }

  // Field sub type (if any)
  const subTypeOptions = typeDefinition
    .subTypes!.types.map((_subType) => TYPE_DEFINITION[_subType])
    .map((_subType) => ({ value: _subType.value, label: _subType.label }));

  const defaultValueSubType = typeDefinition.subTypes!.types.includes(defaultValueType as SubType)
    ? defaultValueType // we use the default value provided
    : typeDefinition.subTypes!.types[0]; // we set the first item from the subType array;

  return (
    <EuiFlexItem>
      <UseField
        path="subType"
        defaultValue={defaultValueSubType}
        config={{
          ...getFieldConfig('type'),
          label: typeDefinition.subTypes!.label,
        }}
      >
        {(subTypeField) => {
          return (
            <EuiFormRow label={subTypeField.label}>
              <EuiComboBox
                placeholder={i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.subTypeField.placeholderLabel',
                  {
                    defaultMessage: 'Select a type',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                options={
                  isMultiField
                    ? filterTypesForMultiField(subTypeOptions!)
                    : isRootLevelField
                    ? subTypeOptions
                    : filterTypesForNonRootFields(subTypeOptions!)
                }
                selectedOptions={subTypeField.value as ComboBoxOption[]}
                onChange={subTypeField.setValue}
                isClearable={false}
              />
            </EuiFormRow>
          );
        }}
      </UseField>
    </EuiFlexItem>
  );
};
