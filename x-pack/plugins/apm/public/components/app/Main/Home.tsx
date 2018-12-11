/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import {
  HistoryTabs,
  IHistoryTab
} from 'x-pack/plugins/apm/public/components/shared/HistoryTabs';
// @ts-ignore
import { KueryBar } from '../../shared/KueryBar';
import { SetupInstructionsLink } from '../../shared/SetupInstructionsLink';
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
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>APM</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SetupInstructionsLink />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <KueryBar />
      <HistoryTabs tabs={homeTabs} />
    </div>
  );
}
