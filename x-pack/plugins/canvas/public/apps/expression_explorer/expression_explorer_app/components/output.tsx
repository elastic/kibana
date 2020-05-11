/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';

import { DebugTree } from './debug_tree';
import { Preview } from './preview';
import { ExpressionError } from './expression_error';
import { useExpressions } from '../hooks';

const TABS = [
  { id: 'preview', name: 'Preview', disabled: false },
  { id: 'tree', name: 'Tree', disabled: false },
];

export const Output: FC = () => {
  const { error } = useExpressions();
  const [selectedTabId, setSelectedTabId] = useState('preview');

  const tabs = TABS.map((tab, index) => (
    <EuiTab
      onClick={() => setSelectedTabId(tab.id)}
      isSelected={tab.id === selectedTabId}
      disabled={tab.disabled}
      key={index}
    >
      {tab.name}
    </EuiTab>
  ));

  if (error) {
    return <ExpressionError />;
  }

  let content = null;

  switch (selectedTabId) {
    case 'preview':
      content = <Preview />;
      break;
    case 'tree':
      content = <DebugTree />;
      break;
  }

  return (
    <div>
      <EuiTabs size="s">{tabs}</EuiTabs>
      <div style={{ padding: 12 }}>{content}</div>
    </div>
  );
};
