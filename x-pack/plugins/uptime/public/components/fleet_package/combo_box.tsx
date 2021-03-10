/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { ConfigKeys, ICustomFields } from './types';

// is there a way in typescript to express ConfigKey of type string[]?
type ComboBoxKeys =
  | ConfigKeys.PORTS
  | ConfigKeys.TAGS
  | ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE
  | ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE
  | ConfigKeys.RESPONSE_STATUS_CHECK
  | ConfigKeys.RESPONSE_RECEIVE_CHECK;

export const ComboBox = ({
  configKey,
  setFields,
  selectedOptions,
}: {
  configKey: ComboBoxKeys;
  setFields: React.Dispatch<React.SetStateAction<ICustomFields>>;
  selectedOptions: string[];
}) => {
  const [formattedSelectedOptions, setSelectedOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(selectedOptions.map((option) => ({ label: option, key: option })));
  const [isInvalid, setInvalid] = useState(false);

  const onOptionsChange = (options: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(options);
    const formattedTags = options.map((option) => option.label);
    setFields((currentFields) => ({ ...currentFields, [configKey]: formattedTags }));
    setInvalid(false);
  };

  const onCreateOption = (tag: string) => {
    const formattedTag = tag.trim();
    const newOption = {
      label: formattedTag,
    };

    setFields((currentFields) => ({
      ...currentFields,
      [configKey]: [...currentFields[configKey], formattedTag],
    }));

    // Select the option.
    setSelectedOptions([...formattedSelectedOptions, newOption]);
  };

  const onSearchChange = (searchValue: string) => {
    if (!searchValue) {
      setInvalid(false);

      return;
    }

    setInvalid(!isValid(searchValue));
  };

  return (
    <EuiComboBox<string>
      noSuggestions
      selectedOptions={formattedSelectedOptions}
      onCreateOption={onCreateOption}
      onChange={onOptionsChange}
      onSearchChange={onSearchChange}
      isInvalid={isInvalid}
    />
  );
};

const isValid = (value: string) => {
  // Ensure that the tag is more than whitespace
  return value.match(/\S/) !== null;
};
