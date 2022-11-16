/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import React, { useState } from 'react';

interface SLO {
  id: string;
  label: string;
}

export function SLOSelector() {
  const availableSLOs = [
    {
      id: '78ab8460-5922-11ed-8eb7-bd8452a46829',
      label: 'My Availability SLO',
    },
    {
      id: 'a43fc160-555b-11ed-9340-37a8799092e9',
      label: 'My Latency SLO',
    },
  ];
  const [selectedSLO, setSelectedSLO] = useState<Array<EuiComboBoxOptionOption<SLO>>>([]);

  const onChange = (slo: Array<EuiComboBoxOptionOption<SLO>>) => {
    setSelectedSLO(slo);
  };

  return (
    <EuiComboBox
      aria-label="Select the SLO"
      placeholder="Select the SLO"
      options={availableSLOs}
      selectedOptions={selectedSLO}
      onChange={onChange}
      isClearable={true}
      singleSelection={true}
    />
  );
}
