/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CustomFieldTypesUI } from './types';
import { FieldTypeSelector } from './field_type/field_type_selector';
import { customFieldTypes } from './schema';
import { builderMap } from './builder';

const FormFieldsComponent: React.FC = () => {
  const [selectedType, setSelectedType] = useState<CustomFieldTypesUI>(customFieldTypes[0]);
  const handleTypeChange = useCallback(
    (val: CustomFieldTypesUI) => {
      setSelectedType(val);
    },
    [setSelectedType]
  );

  const builtCustomFields: React.ReactNode[] = useMemo(() => {
    if (!customFieldTypes) {
      return [];
    }

    let customFieldBuilder: { build: () => React.ReactNode[] } | null = null;

    return customFieldTypes.reduce<React.ReactNode[]>((temp, customFieldType) => {
      const builder = builderMap[customFieldType];

      if (builder == null) {
        return [];
      }

      if (customFieldType === selectedType) {
        customFieldBuilder = builder({
          customFieldType,
        });
      }

      return customFieldBuilder ? [...customFieldBuilder.build()] : [];
    }, []);
  }, [selectedType]);

  const renderCustomField = (customField: React.ReactNode) => {
    if (!customField) {
      return null;
    }

    return Object.values(customField).map((item) => item);
  };

  return (
    <>
      <UseField
        path="fieldLabel"
        component={Field}
        componentProps={{
          euiFieldProps: { 'data-test-subj': 'fieldLabelInput', fullWidth: true },
        }}
      />
      <UseField
        path="fieldType"
        component={FieldTypeSelector}
        componentProps={{
          customFieldTypes,
          dataTestSubj: 'fieldTypeDropdown',
          selectedType,
          handleChange: handleTypeChange,
        }}
      />
      {builtCustomFields.map((customField) => renderCustomField(customField))}
    </>
  );
};

FormFieldsComponent.displayName = 'FormFields';

export const FormFields = memo(FormFieldsComponent);
