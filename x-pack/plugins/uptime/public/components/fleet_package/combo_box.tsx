/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

export interface Props {
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  selectedOptions: string[];
}

export const ComboBox = ({ onChange, onBlur, selectedOptions, ...props }: Props) => {
  const [formattedSelectedOptions, setSelectedOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(selectedOptions.map((option) => ({ label: option, key: option })));
  const [isInvalid, setInvalid] = useState(false);

  const onOptionsChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedOptions(options);
      const formattedTags = options.map((option) => option.label);
      onChange(formattedTags);
      setInvalid(false);
    },
    [onChange, setSelectedOptions, setInvalid]
  );

  const onCreateOption = useCallback(
    (tag: string) => {
      const formattedTag = tag.trim();
      const newOption = {
        label: formattedTag,
      };

      onChange([...selectedOptions, formattedTag]);

      // Select the option.
      setSelectedOptions([...formattedSelectedOptions, newOption]);
    },
    [onChange, formattedSelectedOptions, selectedOptions, setSelectedOptions]
  );

  const onSearchChange = useCallback(
    (searchValue: string) => {
      if (!searchValue) {
        setInvalid(false);

        return;
      }

      setInvalid(!isValid(searchValue));
    },
    [setInvalid]
  );

  return (
    <EuiComboBox<string>
      data-test-subj="syntheticsFleetComboBox"
      noSuggestions
      selectedOptions={formattedSelectedOptions}
      onCreateOption={onCreateOption}
      onChange={onOptionsChange}
      onBlur={() => onBlur?.()}
      onSearchChange={onSearchChange}
      isInvalid={isInvalid}
      {...props}
    />
  );
};

const isValid = (value: string) => {
  // Ensure that the tag is more than whitespace
  return value.match(/\S+/) !== null;
};
