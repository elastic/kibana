/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiTab, EuiTabs } from '@elastic/eui';
import React from 'react';
import {
  HistoryTabs,
  IHistoryTab
} from 'x-pack/plugins/apm/public/components/shared/HistoryTabs';
// @ts-ignore
import { KueryBar } from '../../shared/KueryBar';
import { SetupInstructionsLink } from '../../shared/SetupInstructionsLink';
// @ts-ignore
import { HeaderContainer } from '../../shared/UIComponents';
// @ts-ignore
import { ServiceOverview } from '../ServiceOverview';
import { TraceOverview } from '../TraceOverview';

const homeTabs: IHistoryTab[] = [
  {
    path: '/services',
    name: 'Services',
    component: ServiceOverview
  },
  {
    path: '/traces',
    name: 'Traces',
    component: TraceOverview
  }
];

export function Home() {
  return (
    <div>
      <HeaderContainer>
        <h1>APM</h1>
        <SetupInstructionsLink />
      </HeaderContainer>
      <KueryBar />
      <HistoryTabs tabs={homeTabs} />
    </div>
  );
}
