/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { EuiCheckboxGroupOption } from '@elastic/eui';
import { EuiSpacer, EuiCheckboxGroup } from '@elastic/eui';
import type { CustomFieldTypes } from '../types';
import { getConfig } from './config';

interface FieldOptionsProps {
  disabled: boolean;
  handleOptionChange: (selectedOption: Record<string, boolean>) => void;
  selectedType: CustomFieldTypes;
}

export const FieldOptionsComponent = ({
  disabled,
  handleOptionChange,
  selectedType,
}: FieldOptionsProps) => {
  const [checkboxIdToSelectedMap, setCheckboxIdToSelectedMap] = useState<Record<string, boolean>>(
    {}
  );

  const onChange = useCallback(
    (id: string) => {
      let checkboxOption = {};

      setCheckboxIdToSelectedMap((prev) => {
        checkboxOption = {
          ...prev,
          [id]: !prev[id],
        };

        handleOptionChange(checkboxOption);

        return checkboxOption;
      });
    },
    [handleOptionChange, setCheckboxIdToSelectedMap]
  );

  const config = getConfig(selectedType);

  const checkboxOptions: EuiCheckboxGroupOption[] = [...Object.values(config)];

  return (
    <>
      <EuiSpacer size="xs" />
      <EuiCheckboxGroup
        options={checkboxOptions}
        idToSelectedMap={checkboxIdToSelectedMap}
        onChange={onChange}
        disabled={disabled}
        data-test-subj="custom-field-options-checkbox-group"
      />
    </>
  );
};

FieldOptionsComponent.displayName = 'FieldOptions';

export const FieldOptions = React.memo(FieldOptionsComponent);
