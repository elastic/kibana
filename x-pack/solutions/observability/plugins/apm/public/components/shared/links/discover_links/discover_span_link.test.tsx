/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Location } from 'history';
import type { Span } from '../../../../../typings/es_schemas/ui/span';
import { DiscoverSpanLink } from './discover_span_link';
import { getRenderedHref } from '../../../../utils/test_helpers';

jest.mock('../../../../hooks/use_adhoc_apm_data_view', () => ({
  useAdHocApmDataView: () => ({
    dataView: {
      id: 'foo-1',
    },
  }),
}));

describe('DiscoverSpanLink', () => {
  it('produces the correct URL for a span', async () => {
    const span = {
      span: {
        id: 'test-span-id',
      },
    } as Span;

    const href = await getRenderedHref(() => <DiscoverSpanLink spanId={span.span.id} />, {
      search: '?rangeFrom=now/w&rangeTo=now&refreshPaused=true&refreshInterval=0',
    } as Location);

    expect(href).toMatchInlineSnapshot(
      `"/basepath/app/discover#/?_g=(refreshInterval:(pause:!t,value:0),time:(from:now/w,to:now))&_a=(index:foo-1,interval:auto,query:(language:kuery,query:'span.id:\\"test-span-id\\"'))"`
    );
  });
});
