/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { EuiCheckboxGroupOption } from '@elastic/eui';
import { EuiCheckboxGroup } from '@elastic/eui';
import type { CustomFieldTypesUI } from '../type';
import { getConfig } from './config';

interface FieldOptionsProps {
  disabled: boolean;
  handleOptionChange: (selectedOption: Record<string, boolean>) => void;
  selectedType: CustomFieldTypesUI;
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
        return checkboxOption;
      });
      handleOptionChange(checkboxOption);
    },
    [handleOptionChange, setCheckboxIdToSelectedMap]
  );

  const config = getConfig(selectedType);

  const checkboxOptions: EuiCheckboxGroupOption[] = [...Object.values(config)];

  return (
    <EuiCheckboxGroup
      options={checkboxOptions}
      idToSelectedMap={checkboxIdToSelectedMap}
      onChange={onChange}
      disabled={disabled}
    />
  );
};

FieldOptionsComponent.displayName = 'FieldOptions';

export const FieldOptions = React.memo(FieldOptionsComponent);
