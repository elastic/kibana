/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox } from '@elastic/eui';
import { EuiComboBoxOptionOption } from '@elastic/eui';

interface Props {
  title: string;
  isLoading?: boolean;
  options: Array<EuiComboBoxOptionOption<string>>;
  value?: string;
  placeholder?: string;
  onChange: (value?: string) => void;
  dataTestSubj?: string;
}

export function FilterSelect({
  title,
  isLoading = false,
  options,
  value,
  placeholder = i18n.translate(
    'xpack.apm.agentExplorer.serviceNameSelect.placeholder',
    { defaultMessage: 'Select Option' }
  ),
  onChange,
  dataTestSubj,
}: Props) {

  const selectedOptions = useMemo(() => {
    const optionFound = options.find((option) => option.value === value);
    return optionFound ? [optionFound] : undefined;
  }, [options, value]);

  const handleOnChange = (
    nextSelectedOptions: Array<EuiComboBoxOptionOption<string>>
  ) => {
    const [selectedOption] = nextSelectedOptions;
    onChange(selectedOption?.value);
  };

  return (
    <EuiComboBox
      prepend={title}
      isClearable={true}
      isLoading={isLoading}
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      onChange={handleOnChange}
      placeholder={placeholder}
      data-test-subj={dataTestSubj}
      style={{ width: 300 }}
    />
  );
}
