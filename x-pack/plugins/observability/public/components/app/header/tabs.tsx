/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { useRouteMatch } from 'react-router';

const tabs = [
  {
    id: 'overview',
    name: 'Overview',
    href: '/app/observability/overview',
  },
  {
    id: 'exploratoryView',
    name: 'Exploratory View',
    href: '/app/observability/exploratory-view',
  },
];

export function Tabs() {
  const overviewTab = useRouteMatch('/overview');

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        isSelected={overviewTab ? tab.id === 'overview' : tab.id === 'exploratoryView'}
        key={index}
        href={tab.href}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return <EuiTabs display="condensed">{renderTabs()}</EuiTabs>;
}
