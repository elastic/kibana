/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { TraceWaterfall } from '.';
import { traceOtelSample } from './mock/trace_otel_sample';
import { traceSample } from './mock/trace_sample';
import { MockApmPluginStorybook } from '../../../context/apm_plugin/mock_apm_plugin_storybook';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';

const stories: Meta = {
  title: 'UnifiedTraceWaterfall',
  component: TraceWaterfall,
  decorators: [
    (StoryComponent) => (
      <MockApmPluginStorybook>
        <StoryComponent />
      </MockApmPluginStorybook>
    ),
  ],
};

export default stories;

export const ExampleClockSkew: StoryFn<{}> = () => {
  return (
    <TraceWaterfall
      onClick={(params) => {
        // eslint-disable-next-line no-console
        console.log('##### Clicked:', params);
      }}
      onErrorClick={(params) => {
        // eslint-disable-next-line no-console
        console.log('##### Error clicked:', params);
      }}
      traceItems={[
        {
          id: 'd2efb76164a77608',
          timestamp: '2025-05-21T18:50:00.660Z',
          name: 'HTTP GET /api',
          duration: 5000000,
          serviceName: 'frontend',
          traceId: 'ed1aacaf31264b93e0e405e42b00af74',
          hasError: true,
        },
        {
          id: 'cdd3568d81149715',
          timestamp: '2025-05-21T18:50:00.652Z', // Starts before its parent
          name: 'POST /getquote',
          duration: 3677750,
          parentId: 'd2efb76164a77608',
          serviceName: 'quote',
          traceId: 'ed1aacaf31264b93e0e405e42b00af74',
        },
        {
          id: 'a111aabbccddeeff',
          timestamp: '2025-05-21T18:50:00.653Z',
          name: 'DB query',
          duration: 1000000,
          parentId: 'cdd3568d81149715',
          serviceName: 'database',
          traceId: 'ed1aacaf31264b93e0e405e42b00af74',
        },
      ]}
    />
  );
};
export const Example: StoryFn<{}> = () => {
  return (
    <TraceWaterfall
      traceItems={[
        {
          id: '06b480d1e6e2ac2e',
          timestamp: '2025-05-27T12:15:04.973Z',
          name: 'POST',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 53170917,
          hasError: false,
          serviceName: 'load-generator',
        },
        {
          id: '2b18312dfedbf16a',
          timestamp: '2025-05-27T12:15:04.974Z',
          // timestamp: '2025-05-27T12:15:04.973Z',
          name: 'executing api route (pages) /api/checkout',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 51298750,
          hasError: false,
          parentId: '06b480d1e6e2ac2e',
          serviceName: 'frontend',
        },
        {
          id: '41b39c13ec0166a8',
          timestamp: '2025-05-27T12:15:06.024Z',
          // timestamp: '2025-05-27T12:15:04.973Z',
          name: 'grpc.oteldemo.ProductCatalogService/GetProduct',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 1187042,
          hasError: false,
          parentId: '2b18312dfedbf16a',
          serviceName: 'frontend',
        },
        {
          id: '255547a7b6b19871',
          timestamp: '2025-05-27T12:15:06.500Z',
          // timestamp: '2025-05-27T12:15:04.973Z',
          name: 'oteldemo.ProductCatalogService/GetProduct',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 90416,
          hasError: false,
          parentId: '41b39c13ec0166a8',
          serviceName: 'product-catalog',
        },
      ]}
      highlightedTraceId="41b39c13ec0166a8"
    />
  );
};
export const HiddenAccordionExample: StoryFn<{}> = () => {
  const traceItems = traceOtelSample.map(
    (item) =>
      ({
        id: item._source.span_id,
        name: item._source.name,
        timestamp: item._source['@timestamp'],
        duration: item._source.duration / 1000,
        traceId: item._source.trace_id,
        parentId: item._source.parent_span_id,
        serviceName: item._source.resource.attributes['service.name'],
      } as TraceItem)
  );
  return (
    <TraceWaterfall
      traceItems={traceItems}
      showAccordion={false}
      highlightedTraceId="99e36adf40935241"
      onClick={() => {}}
    />
  );
};
export const OpenTelemetryExample: StoryFn<{}> = () => {
  const traceItems = traceOtelSample.map(
    (item) =>
      ({
        id: item._source.span_id,
        name: item._source.name,
        timestamp: item._source['@timestamp'],
        duration: item._source.duration / 1000,
        traceId: item._source.trace_id,
        parentId: item._source.parent_span_id,
        serviceName: item._source.resource.attributes['service.name'],
      } as TraceItem)
  );
  return <TraceWaterfall traceItems={traceItems} />;
};

export const APMExample: StoryFn<{}> = () => {
  const traceItems = traceSample.traceItems.traceDocs.map(
    (item) =>
      ({
        id: item.span.id || item.transaction?.id,
        name: item.span.name || item.transaction?.name,
        timestamp: new Date(item.timestamp.us / 1000).toISOString(),
        duration: item.span.duration?.us || item.transaction?.duration?.us,
        traceId: item.trace.id,
        parentId: item.parent?.id,
        serviceName: item.service.name || item.service.name,
      } as TraceItem)
  );

  return <TraceWaterfall traceItems={traceItems} />;
};
