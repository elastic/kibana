/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { action } from '@storybook/addon-actions';
import { TraceWaterfall } from '.';
import { traceUnprocessedOtelSample } from './mock/trace_unprocessed_otel_sample';
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

export const ManyChildren: StoryFn<{}> = () => {
  return (
    <TraceWaterfall
      traceItems={[
        {
          id: '1',
          timestampUs: new Date('2025-05-21T18:50:00.660Z').getTime() * 1000,
          name: 'Root',
          duration: 5000000,
          serviceName: 'frontend',
          traceId: 'ed1aacaf31264b93e0e405e42b00af74',
          errors: [{ errorDocId: '1' }],
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        ...Array(200)
          .fill(0)
          .map((_, index) => ({
            id: `child-${index}`,
            timestampUs: new Date(`2025-05-21T18:50:00.${660 + index}Z`).getTime() * 1000,
            name: `Child ${index + 1}`,
            duration: 1000000 + index * 1000,
            parentId: '1',
            serviceName: 'child-service',
            traceId: 'ed1aacaf31264b93e0e405e42b00af74',
            errors: [],
            spanLinksCount: { incoming: 0, outgoing: 0 },
          })),
      ]}
    />
  );
};

export const ExampleClockSkew: StoryFn<{}> = () => {
  return (
    <TraceWaterfall
      onClick={action('onClick')}
      onErrorClick={action('onErrorClick')}
      traceItems={[
        {
          id: 'd2efb76164a77608',
          timestampUs: new Date('2025-05-21T18:50:00.660Z').getTime() * 1000,
          name: 'HTTP GET /api',
          duration: 5000000,
          serviceName: 'frontend',
          traceId: 'ed1aacaf31264b93e0e405e42b00af74',
          errors: [{ errorDocId: '1' }],
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: 'cdd3568d81149715',
          timestampUs: new Date('2025-05-21T18:50:00.652Z').getTime() * 1000, // Starts before its parent
          name: 'POST /getquote',
          duration: 3677750,
          parentId: 'd2efb76164a77608',
          serviceName: 'quote',
          traceId: 'ed1aacaf31264b93e0e405e42b00af74',
          errors: [],
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: 'a111aabbccddeeff',
          timestampUs: new Date('2025-05-21T18:50:00.653Z').getTime() * 1000,
          name: 'DB query',
          duration: 1000000,
          parentId: 'cdd3568d81149715',
          serviceName: 'database',
          traceId: 'ed1aacaf31264b93e0e405e42b00af74',
          errors: [],
          spanLinksCount: { incoming: 0, outgoing: 0 },
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
          timestampUs: new Date('2025-05-27T12:15:04.973Z').getTime() * 1000,
          name: 'POST',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 53170917,
          errors: [],
          serviceName: 'load-generator',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: '2b18312dfedbf16a',
          timestampUs: new Date('2025-05-27T12:15:04.974Z').getTime() * 1000,
          name: 'executing api route (pages) /api/checkout',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 51298750,
          errors: [],
          parentId: '06b480d1e6e2ac2e',
          serviceName: 'frontend',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: '41b39c13ec0166a8',
          timestampUs: new Date('2025-05-27T12:15:06.024Z').getTime() * 1000,
          name: 'grpc.oteldemo.ProductCatalogService/GetProduct',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 1187042,
          errors: [],
          parentId: '2b18312dfedbf16a',
          serviceName: 'frontend',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: '255547a7b6b19871',
          timestampUs: new Date('2025-05-27T12:15:06.500Z').getTime() * 1000,
          name: 'oteldemo.ProductCatalogService/GetProduct',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 90416,
          errors: [],
          parentId: '41b39c13ec0166a8',
          serviceName: 'product-catalog',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
      ]}
      highlightedTraceId="41b39c13ec0166a8"
    />
  );
};

export const ExampleWithServiceLegend: StoryFn<{}> = () => {
  return (
    <TraceWaterfall
      traceItems={[
        {
          id: '06b480d1e6e2ac2e',
          timestampUs: new Date('2025-05-27T12:15:04.973Z').getTime() * 1000,
          name: 'POST',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 53170917,
          errors: [],
          serviceName: 'load-generator',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: '2b18312dfedbf16a',
          timestampUs: new Date('2025-05-27T12:15:04.974Z').getTime() * 1000,
          name: 'executing api route (pages) /api/checkout',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 51298750,
          errors: [],
          parentId: '06b480d1e6e2ac2e',
          serviceName: 'frontend',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: '41b39c13ec0166a8',
          timestampUs: new Date('2025-05-27T12:15:06.024Z').getTime() * 1000,
          name: 'grpc.oteldemo.ProductCatalogService/GetProduct',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 1187042,
          errors: [],
          parentId: '2b18312dfedbf16a',
          serviceName: 'frontend',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: '255547a7b6b19871',
          timestampUs: new Date('2025-05-27T12:15:06.500Z').getTime() * 1000,
          name: 'oteldemo.ProductCatalogService/GetProduct',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 90416,
          errors: [],
          parentId: '41b39c13ec0166a8',
          serviceName: 'product-catalog',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
      ]}
      highlightedTraceId="41b39c13ec0166a8"
      showLegend
    />
  );
};

export const ExampleWithTypeLegend: StoryFn<{}> = () => {
  return (
    <TraceWaterfall
      traceItems={[
        {
          id: '06b480d1e6e2ac2e',
          timestampUs: new Date('2025-05-27T12:15:04.973Z').getTime() * 1000,
          name: 'POST',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 53170917,
          errors: [],
          serviceName: 'frontend',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: '2b18312dfedbf16a',
          timestampUs: new Date('2025-05-27T12:15:04.974Z').getTime() * 1000,
          name: 'executing api route (pages) /api/checkout',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 51298750,
          errors: [],
          parentId: '06b480d1e6e2ac2e',
          serviceName: 'frontend',
          type: 'http',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: '41b39c13ec0166a8',
          timestampUs: new Date('2025-05-27T12:15:06.024Z').getTime() * 1000,
          name: 'grpc.oteldemo.ProductCatalogService/GetProduct',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 1187042,
          errors: [],
          parentId: '2b18312dfedbf16a',
          serviceName: 'frontend',
          type: 'http',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: '255547a7b6b19871',
          timestampUs: new Date('2025-05-27T12:15:06.500Z').getTime() * 1000,
          name: 'oteldemo.ProductCatalogService/GetProduct',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 90416,
          errors: [],
          parentId: '41b39c13ec0166a8',
          serviceName: 'frontend',
          type: 'css',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
      ]}
      highlightedTraceId="41b39c13ec0166a8"
      serviceName="frontend"
      showLegend
    />
  );
};
export const HiddenAccordionExample: StoryFn<{}> = () => {
  const traceItems = traceUnprocessedOtelSample.map(
    (item) =>
      ({
        id: item._source.span_id,
        name: item._source.name,
        timestampUs: new Date(item._source['@timestamp']).getTime() * 1000,
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
  const traceItems = traceUnprocessedOtelSample.map(
    (item) =>
      ({
        id: item._source.span_id,
        name: item._source.name,
        timestampUs: new Date(item._source['@timestamp']).getTime() * 1000,
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
        timestampUs: item.timestamp.us,
        duration: item.span.duration?.us || item.transaction?.duration?.us,
        traceId: item.trace.id,
        parentId: item.parent?.id,
        serviceName: item.service.name,
      } as TraceItem)
  );

  return <TraceWaterfall traceItems={traceItems} />;
};

export const CompositeSpanExample: StoryFn<{}> = () => {
  return (
    <TraceWaterfall
      traceItems={[
        {
          id: 'root-tx',
          timestampUs: new Date('2025-05-27T12:15:04.973Z').getTime() * 1000,
          name: 'GET /users',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 10000000,
          errors: [],
          serviceName: 'api-service',
          spanLinksCount: { incoming: 0, outgoing: 0 },
        },
        {
          id: 'composite-span',
          timestampUs: new Date('2025-05-27T12:15:05.000Z').getTime() * 1000,
          name: 'SELECT * FROM users',
          traceId: 'cc847a76570773d6fc96fac63dfcddd2',
          duration: 5000000,
          errors: [],
          parentId: 'root-tx',
          serviceName: 'api-service',
          type: 'db',
          spanLinksCount: { incoming: 0, outgoing: 0 },
          icon: 'database',
          composite: {
            count: 9,
            sum: 4500000,
            compressionStrategy: 'exact_match',
          },
        },
      ]}
    />
  );
};
