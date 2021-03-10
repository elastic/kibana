/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiTabs, EuiTab } from '@elastic/eui';

const tabs = [
  {
    id: 'savedCharts',
    name: 'Saved charts',
  },
  {
    id: 'predefinedCharts',
    name: 'Predefined charts',
  },
];

export function SelectionTabs() {
  const [selectedTabId, setSelectedTabId] = useState('predefinedCharts');

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return <EuiTabs display="condensed">{renderTabs()}</EuiTabs>;
}
