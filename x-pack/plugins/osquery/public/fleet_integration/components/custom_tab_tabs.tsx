/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiTitle, EuiSpacer } from '@elastic/eui';
import React, { Fragment, useState } from 'react';

import { QueriesPage } from '../../queries/queries';

const tabs = [
  {
    id: 'saved_queries',
    name: 'Saved Queries',
    content: (
      <Fragment>
        <EuiSpacer />
        <EuiTitle>
          <h3>{'Saved Queries'}</h3>
        </EuiTitle>
        <QueriesPage />
      </Fragment>
    ),
  },
];

const CustomTabsTabComponent = () => {
  const [selectedTab, setSelectedTab] = useState(tabs[0]);

  // @ts-expect-error update types
  return <EuiTabbedContent tabs={tabs} selectedTab={selectedTab} onTabClick={setSelectedTab} />;
};

export const CustomTabsTab = React.memo(CustomTabsTabComponent);
