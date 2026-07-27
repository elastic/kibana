/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Router } from '@kbn/typed-react-router-config';
import { Outlet, RouterProvider, createRouter } from '@kbn/typed-react-router-config';
import { z } from '@kbn/zod/v4';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import {
  DEFAULT_ANOMALY_THRESHOLD,
  anomalyThresholdSchema,
} from '../../../../../../common/anomaly_detection/anomaly_threshold';
import { ENVIRONMENT_ALL } from '../../../../../../common/environment_filter_values';
import { environmentSchema } from '../../../../../../common/environment_rt';
import {
  LatencyAggregationType,
  latencyAggregationTypeSchema,
} from '../../../../../../common/latency_aggregation_types';
import { toBooleanFromString } from '../../../../../../common/utils/to_boolean_from_string';
import type { ApmPluginContextValue } from '../../../../../context/apm_plugin/apm_plugin_context';
import { ApmPluginContext } from '../../../../../context/apm_plugin/apm_plugin_context';
import { ServiceLink } from '.';

// This mirrors the query schema/defaults shared by the real
// `/services/{serviceName}` and `/mobile-services/{serviceName}` routes (see
// `service_detail` and `mobile_service_detail`), without pulling in the full
// route tree (and all the page components it references transitively),
// which is what made this test slow/flaky when rendered through the real
// `apmRouter` via the storybook decorator.
const serviceQuerySchema = environmentSchema
  .merge(
    z.object({
      rangeFrom: z.string(),
      rangeTo: z.string(),
      kuery: z.string(),
      serviceGroup: z.string(),
      comparisonEnabled: toBooleanFromString,
    })
  )
  .merge(
    z.object({
      latencyAggregationType: latencyAggregationTypeSchema.optional(),
      anomalyThreshold: anomalyThresholdSchema.optional(),
    })
  );

const serviceDefaults = {
  query: {
    kuery: '',
    environment: ENVIRONMENT_ALL.value,
    serviceGroup: '',
    latencyAggregationType: LatencyAggregationType.avg,
    anomalyThreshold: DEFAULT_ANOMALY_THRESHOLD,
  },
};

const testRoutes = {
  '/services/{serviceName}': {
    element: <Outlet />,
    params: z
      .object({ path: z.object({ serviceName: z.string() }) })
      .merge(z.object({ query: serviceQuerySchema })),
    defaults: serviceDefaults,
    children: {
      '/services/{serviceName}/overview': {
        element: <Outlet />,
        params: z.object({ query: z.object({}).optional() }),
      },
    },
  },
  '/mobile-services/{serviceName}': {
    element: <Outlet />,
    params: z
      .object({ path: z.object({ serviceName: z.string() }) })
      .merge(z.object({ query: serviceQuerySchema })),
    defaults: serviceDefaults,
    children: {
      '/mobile-services/{serviceName}/overview': {
        element: <Outlet />,
        params: z.object({ query: z.object({}).optional() }),
      },
    },
  },
};

const testRouter = createRouter(testRoutes) as unknown as Router<any>;

const mockApmPluginContextValue = {
  core: {
    http: {
      basePath: {
        prepend: (path: string) => `/basepath${path}`,
      },
    },
  },
} as unknown as ApmPluginContextValue;

function renderServiceLink(props: React.ComponentProps<typeof ServiceLink>) {
  const history = createMemoryHistory();

  return render(
    <ApmPluginContext.Provider value={mockApmPluginContextValue}>
      <RouterProvider router={testRouter} history={history}>
        <ServiceLink {...props} />
      </RouterProvider>
    </ApmPluginContext.Provider>
  );
}

const query = {
  environment: 'ENVIRONMENT_ALL',
  kuery: '',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  serviceGroup: '',
  comparisonEnabled: false,
};

const params =
  'anomalyThreshold=major&comparisonEnabled=false&environment=ENVIRONMENT_ALL&kuery=&latencyAggregationType=avg&rangeFrom=now-15m&rangeTo=now&serviceGroup=';

describe('ServiceLink', () => {
  it('links to service details', async () => {
    expect(() =>
      renderServiceLink({ agentName: 'java', query, serviceName: 'opbeans-java' })
    ).not.toThrowError();

    expect(await screen.findByTestId('serviceLink_java')).toHaveAttribute(
      'href',
      `/basepath/app/apm/services/opbeans-java/overview?${params}`
    );
  });

  it('links to mobile service details', async () => {
    expect(() =>
      renderServiceLink({ agentName: 'android/java', query, serviceName: 'opbeans-android' })
    ).not.toThrowError();
    expect(() =>
      renderServiceLink({ agentName: 'iOS/swift', query, serviceName: 'opbeans-swift' })
    ).not.toThrowError();

    expect(await screen.findByTestId('serviceLink_android/java')).toHaveAttribute(
      'href',
      `/basepath/app/apm/mobile-services/opbeans-android/overview?${params}`
    );

    expect(await screen.findByTestId('serviceLink_iOS/swift')).toHaveAttribute(
      'href',
      `/basepath/app/apm/mobile-services/opbeans-swift/overview?${params}`
    );
  });
});
