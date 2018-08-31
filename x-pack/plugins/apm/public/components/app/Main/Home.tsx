/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiSpacer, EuiTabbedContent } from '@elastic/eui';
import React from 'react';
import { KueryBar } from '../../shared/KueryBar';
import { SetupInstructionsLink } from '../../shared/SetupInstructionsLink';
import { HeaderContainer } from '../../shared/UIComponents';
import ServiceOverview from '../ServiceOverview';
import TraceOverview from '../TraceOverview';

export function Home() {
  return (
    <div>
      <HeaderContainer>
        <h1>APM</h1>
        <SetupInstructionsLink />
      </HeaderContainer>
      <KueryBar />
      <EuiSpacer />
      <EuiTabbedContent
        tabs={[
          {
            id: 'services_overview',
            name: 'Services',
            content: <ServiceOverview />
          },
          {
            id: 'traces_overview',
            name: 'Traces',
            content: <TraceOverview />
          }
        ]}
      />
    </div>
  );
}
