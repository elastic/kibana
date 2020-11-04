/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType } from 'react';
import { EuiThemeProvider } from '../../../../../../observability/public';
import { ServiceStatsList } from './ServiceStatsList';

export default {
  title: 'app/ServiceMap/Popover/ServiceStatsList',
  component: ServiceStatsList,
  decorators: [
    (Story: ComponentType) => (
      <EuiThemeProvider>
        <Story />
      </EuiThemeProvider>
    ),
  ],
};

export function Example() {
  return (
    <ServiceStatsList
      avgCpuUsage={0.32809666568309237}
      avgMemoryUsage={0.5504868173242986}
      transactionStats={{
        avgRequestsPerMinute: 164.47222031860858,
        avgTransactionDuration: 61634.38905590272,
      }}
      avgErrorRate={0.556068173242986}
    />
  );
}

export function SomeNullValues() {
  return (
    <ServiceStatsList
      avgCpuUsage={null}
      avgErrorRate={0.615972134074397}
      avgMemoryUsage={null}
      transactionStats={{
        avgRequestsPerMinute: 8.439583235652972,
        avgTransactionDuration: 238792.54809512055,
      }}
    />
  );
}

export function AllNullValues() {
  return (
    <ServiceStatsList
      avgCpuUsage={null}
      avgErrorRate={null}
      avgMemoryUsage={null}
      transactionStats={{
        avgRequestsPerMinute: null,
        avgTransactionDuration: null,
      }}
    />
  );
}
