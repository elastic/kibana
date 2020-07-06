/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TraceAPIResponse } from '../../../../../../server/lib/traces/get_trace';
import { WaterfallContainer } from './index';
import {
  location,
  urlParams,
  simpleTrace,
  traceWithErrors,
  traceChildStartBeforeParent,
  inferredSpans,
} from './waterfallContainer.stories.data';
import { getWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';

storiesOf('app/TransactionDetails/Waterfall', module).add(
  'simple',
  () => {
    const waterfall = getWaterfall(
      simpleTrace as TraceAPIResponse,
      '975c8d5bfd1dd20b'
    );
    return (
      <WaterfallContainer
        location={location}
        urlParams={urlParams}
        waterfall={waterfall}
        exceedsMax={false}
      />
    );
  },
  { info: { source: false } }
);

storiesOf('app/TransactionDetails/Waterfall', module).add(
  'with errors',
  () => {
    const waterfall = getWaterfall(
      (traceWithErrors as unknown) as TraceAPIResponse,
      '975c8d5bfd1dd20b'
    );
    return (
      <WaterfallContainer
        location={location}
        urlParams={urlParams}
        waterfall={waterfall}
        exceedsMax={false}
      />
    );
  },
  { info: { source: false } }
);

storiesOf('app/TransactionDetails/Waterfall', module).add(
  'child starts before parent',
  () => {
    const waterfall = getWaterfall(
      traceChildStartBeforeParent as TraceAPIResponse,
      '975c8d5bfd1dd20b'
    );
    return (
      <WaterfallContainer
        location={location}
        urlParams={urlParams}
        waterfall={waterfall}
        exceedsMax={false}
      />
    );
  },
  { info: { source: false } }
);

storiesOf('app/TransactionDetails/Waterfall', module).add(
  'inferred spans',
  () => {
    const waterfall = getWaterfall(
      inferredSpans as TraceAPIResponse,
      'f2387d37260d00bd'
    );
    return (
      <WaterfallContainer
        location={location}
        urlParams={urlParams}
        waterfall={waterfall}
        exceedsMax={false}
      />
    );
  },
  { info: { source: false } }
);
