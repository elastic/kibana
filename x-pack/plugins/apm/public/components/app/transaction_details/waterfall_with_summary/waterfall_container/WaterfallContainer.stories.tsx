/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { APIReturnType } from '../../../../../services/rest/createCallApmApi';
import { WaterfallContainer } from './index';
import { getWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';
import {
  inferredSpans,
  simpleTrace,
  traceChildStartBeforeParent,
  traceWithErrors,
  urlParams,
} from './waterfallContainer.stories.data';

type TraceAPIResponse = APIReturnType<'GET /api/apm/traces/{traceId}'>;

export default {
  title: 'app/TransactionDetails/Waterfall',
  component: WaterfallContainer,
  decorators: [
    (Story: ComponentType) => (
      <MemoryRouter>
        <MockApmPluginContextWrapper>
          <Story />
        </MockApmPluginContextWrapper>
      </MemoryRouter>
    ),
  ],
};

export function Example() {
  const waterfall = getWaterfall(
    simpleTrace as TraceAPIResponse,
    '975c8d5bfd1dd20b'
  );
  return (
    <WaterfallContainer
      urlParams={urlParams}
      waterfall={waterfall}
      exceedsMax={false}
    />
  );
}

export function WithErrors() {
  const waterfall = getWaterfall(
    (traceWithErrors as unknown) as TraceAPIResponse,
    '975c8d5bfd1dd20b'
  );
  return (
    <WaterfallContainer
      urlParams={urlParams}
      waterfall={waterfall}
      exceedsMax={false}
    />
  );
}

export function ChildStartsBeforeParent() {
  const waterfall = getWaterfall(
    traceChildStartBeforeParent as TraceAPIResponse,
    '975c8d5bfd1dd20b'
  );
  return (
    <WaterfallContainer
      urlParams={urlParams}
      waterfall={waterfall}
      exceedsMax={false}
    />
  );
}

export function InferredSpans() {
  const waterfall = getWaterfall(
    inferredSpans as TraceAPIResponse,
    'f2387d37260d00bd'
  );
  return (
    <WaterfallContainer
      urlParams={urlParams}
      waterfall={waterfall}
      exceedsMax={false}
    />
  );
}
