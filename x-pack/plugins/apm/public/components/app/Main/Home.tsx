/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiTabbedContent } from '@elastic/eui';
import React from 'react';
// @ts-ignore
import { KueryBar } from '../../shared/KueryBar';
import { SetupInstructionsLink } from '../../shared/SetupInstructionsLink';
// @ts-ignore
import { HeaderContainer } from '../../shared/UIComponents';
// @ts-ignore
import { ServiceOverview } from '../ServiceOverview';
import { TraceOverview } from '../TraceOverview';

export function Home() {
  return (
    <div>
      <HeaderContainer>
        <h1>APM</h1>
        <SetupInstructionsLink />
      </HeaderContainer>
      <KueryBar />
      <EuiTabbedContent
        className="k6Tab--large"
        tabs={[
          {
            id: 'services_overview',
            name: 'Services',
            content: <ServiceOverview />
          },
          { id: 'traces_overview', name: 'Traces', content: <TraceOverview /> }
        ]}
      />
    </div>
  );
}
