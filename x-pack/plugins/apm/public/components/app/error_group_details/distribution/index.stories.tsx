/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../../../../context/apm_plugin/apm_plugin_context';
import { ErrorDistribution } from '.';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

export default {
  title: 'app/ErrorGroupDetails/distribution',
  component: ErrorDistribution,
  decorators: [
    (Story: ComponentType) => {
      const kibanaContextServices = {
        uiSettings: { get: () => {} },
      };

      const apmPluginContextMock = {
        observabilityRuleTypeRegistry: { getFormatter: () => undefined },
        core: {
          uiSettings: kibanaContextServices.uiSettings,
        },
      } as unknown as ApmPluginContextValue;

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
    bucketSize: 62350,
    currentPeriod: [
      { x: 1624279912350, y: 6 },
      { x: 1624279974700, y: 1 },
      { x: 1624280037050, y: 2 },
      { x: 1624280099400, y: 3 },
      { x: 1624280161750, y: 13 },
      { x: 1624280224100, y: 1 },
      { x: 1624280286450, y: 2 },
      { x: 1624280348800, y: 0 },
      { x: 1624280411150, y: 4 },
      { x: 1624280473500, y: 4 },
      { x: 1624280535850, y: 1 },
      { x: 1624280598200, y: 4 },
      { x: 1624280660550, y: 0 },
      { x: 1624280722900, y: 2 },
      { x: 1624280785250, y: 3 },
      { x: 1624280847600, y: 0 },
    ],
    previousPeriod: [
      { x: 1624279912350, y: 6 },
      { x: 1624279974700, y: 1 },
      { x: 1624280037050, y: 2 },
      { x: 1624280099400, y: 3 },
      { x: 1624280161750, y: 13 },
      { x: 1624280224100, y: 1 },
      { x: 1624280286450, y: 2 },
      { x: 1624280348800, y: 0 },
      { x: 1624280411150, y: 4 },
      { x: 1624280473500, y: 4 },
      { x: 1624280535850, y: 1 },
      { x: 1624280598200, y: 4 },
      { x: 1624280660550, y: 0 },
      { x: 1624280722900, y: 2 },
      { x: 1624280785250, y: 3 },
      { x: 1624280847600, y: 0 },
    ],
  };

  return (
    <ErrorDistribution
      fetchStatus={FETCH_STATUS.SUCCESS}
      distribution={distribution}
      title="Foo title"
    />
  );
}

export function EmptyState() {
  return (
    <ErrorDistribution
      fetchStatus={FETCH_STATUS.SUCCESS}
      distribution={{
        bucketSize: 10,
        currentPeriod: [],
        previousPeriod: [],
      }}
      title="Foo title"
    />
  );
}
