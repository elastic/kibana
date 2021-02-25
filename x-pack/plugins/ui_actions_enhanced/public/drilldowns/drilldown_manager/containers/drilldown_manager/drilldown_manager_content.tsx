/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiTabbedContent, EuiTabbedContentProps } from '@elastic/eui';
import { useDrilldownManager } from '../context';
import { FormDrilldownWizard } from '../form_drilldown_wizard';

export const DrilldownManagerContent: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const route = drilldowns.useRoute();

  const tabs: EuiTabbedContentProps['tabs'] = [
    {
      id: 'create',
      name: 'Create new',
      content: <FormDrilldownWizard />,
    },
    {
      id: 'manage',
      name: 'Manage',
      content: 'manage...',
    },
  ];

  return (
    <EuiTabbedContent
      tabs={tabs}
      selectedTab={tabs.find(({ id }) => id === route[0])}
      onTabClick={({ id }) => drilldowns.setRoute([id])}
    />
  );
};
