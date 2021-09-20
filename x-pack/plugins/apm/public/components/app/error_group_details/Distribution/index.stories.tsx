/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../../../../context/apm_plugin/apm_plugin_context';
import { ErrorDistribution } from './';

export default {
  title: 'app/ErrorGroupDetails/Distribution',
  component: ErrorDistribution,
  decorators: [
    (Story: ComponentType) => {
      const apmPluginContextMock = {
        observabilityRuleTypeRegistry: { getFormatter: () => undefined },
      } as unknown as ApmPluginContextValue;

      const kibanaContextServices = {
        uiSettings: { get: () => {} },
      };

      return (
        <ApmPluginContext.Provider value={apmPluginContextMock}>
          <KibanaContextProvider services={kibanaContextServices}>
            <Story />
          </KibanaContextProvider>
        </ApmPluginContext.Provider>
      );
    },
  ],
};

export function Example() {
  const distribution = {
    noHits: false,
    bucketSize: 62350,
    buckets: [
      { key: 1624279912350, count: 6 },
      { key: 1624279974700, count: 1 },
      { key: 1624280037050, count: 2 },
      { key: 1624280099400, count: 3 },
      { key: 1624280161750, count: 13 },
      { key: 1624280224100, count: 1 },
      { key: 1624280286450, count: 2 },
      { key: 1624280348800, count: 0 },
      { key: 1624280411150, count: 4 },
      { key: 1624280473500, count: 4 },
      { key: 1624280535850, count: 1 },
      { key: 1624280598200, count: 4 },
      { key: 1624280660550, count: 0 },
      { key: 1624280722900, count: 2 },
      { key: 1624280785250, count: 3 },
      { key: 1624280847600, count: 0 },
    ],
  };

  return <ErrorDistribution distribution={distribution} title="Foo title" />;
}

export function EmptyState() {
  return (
    <ErrorDistribution
      distribution={{
        bucketSize: 10,
        buckets: [],
        noHits: true,
      }}
      title="Foo title"
    />
  );
}
