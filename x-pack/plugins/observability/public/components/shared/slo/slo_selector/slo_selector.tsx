/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import React, { useState } from 'react';

interface Option {
  label: string;
}

export function SloSelector() {
  const options: Option[] = [
    {
      label: 'Titan',
    },
    {
      label: 'Enceladus',
    },
  ];

  const [selectedOptions, setSelected] = useState<Option[]>([options[1]]);
  const onChange = (opts: Option[]) => {
    setSelected(opts);
  };

  return (
    <EuiComboBox
      aria-label="SLO selector"
      placeholder="Select a SLO"
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      onChange={onChange}
    />
  );
}
