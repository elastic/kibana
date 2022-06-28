/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Location } from 'history';
import React from 'react';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { Span } from '../../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { getRenderedHref } from '../../../../utils/test_helpers';
import { DiscoverErrorLink } from './discover_error_link';
import { DiscoverSpanLink } from './discover_span_link';
import { DiscoverTransactionLink } from './discover_transaction_link';

describe('DiscoverLinks', () => {
  it('produces the correct URL for a transaction', async () => {
    const transaction = {
      transaction: {
        id: '8b60bd32ecc6e150',
      },
      trace: {
        id: '8b60bd32ecc6e1506735a8b6cfcf175c',
      },
    } as Transaction;

    const href = await getRenderedHref(
      () => <DiscoverTransactionLink transaction={transaction} />,
      {
        search:
          '?rangeFrom=now/w&rangeTo=now&refreshPaused=true&refreshInterval=0',
      } as Location
    );

    expect(href).toMatchInlineSnapshot(
      `"/basepath/app/discover#/?_g=(refreshInterval:(pause:!t,value:0),time:(from:now/w,to:now))&_a=(index:apm_static_index_pattern_id,interval:auto,query:(language:kuery,query:'processor.event:\\"transaction\\" AND transaction.id:\\"8b60bd32ecc6e150\\" AND trace.id:\\"8b60bd32ecc6e1506735a8b6cfcf175c\\"'))"`
    );
  });

  it('produces the correct URL for a span', async () => {
    const span = {
      span: {
        id: 'test-span-id',
      },
    } as Span;

    const href = await getRenderedHref(() => <DiscoverSpanLink span={span} />, {
      search:
        '?rangeFrom=now/w&rangeTo=now&refreshPaused=true&refreshInterval=0',
    } as Location);

    expect(href).toMatchInlineSnapshot(
      `"/basepath/app/discover#/?_g=(refreshInterval:(pause:!t,value:0),time:(from:now/w,to:now))&_a=(index:apm_static_index_pattern_id,interval:auto,query:(language:kuery,query:'span.id:\\"test-span-id\\"'))"`
    );
  });

  test('DiscoverErrorLink should produce the correct URL', async () => {
    const error = {
      service: {
        name: 'service-name',
      },
      error: {
        grouping_key: 'grouping-key',
      },
    } as APMError;
    const href = await getRenderedHref(
      () => <DiscoverErrorLink error={error} />,
      {
        search:
          '?rangeFrom=now/w&rangeTo=now&refreshPaused=true&refreshInterval=0',
      } as Location
    );

    expect(href).toMatchInlineSnapshot(
      `"/basepath/app/discover#/?_g=(refreshInterval:(pause:!t,value:0),time:(from:now/w,to:now))&_a=(index:apm_static_index_pattern_id,interval:auto,query:(language:kuery,query:'service.name:\\"service-name\\" AND error.grouping_key:\\"grouping-key\\"'),sort:('@timestamp':desc))"`
    );
  });

  test('DiscoverErrorLink should include optional kuery string in URL', async () => {
    const error = {
      service: {
        name: 'service-name',
      },
      error: {
        grouping_key: 'grouping-key',
      },
    } as APMError;

    const href = await getRenderedHref(
      () => <DiscoverErrorLink error={error} kuery="some:kuery-string" />,
      {
        search:
          '?rangeFrom=now/w&rangeTo=now&refreshPaused=true&refreshInterval=0',
      } as Location
    );

    expect(href).toMatchInlineSnapshot(
      `"/basepath/app/discover#/?_g=(refreshInterval:(pause:!t,value:0),time:(from:now/w,to:now))&_a=(index:apm_static_index_pattern_id,interval:auto,query:(language:kuery,query:'service.name:\\"service-name\\" AND error.grouping_key:\\"grouping-key\\" AND some:kuery-string'),sort:('@timestamp':desc))"`
    );
  });
});
