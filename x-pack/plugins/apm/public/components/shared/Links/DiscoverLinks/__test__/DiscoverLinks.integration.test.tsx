/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { APMError } from '../../../../../../typings/es_schemas/ui/APMError';
import { Span } from '../../../../../../typings/es_schemas/ui/Span';
import { Transaction } from '../../../../../../typings/es_schemas/ui/Transaction';
import * as savedObjects from '../../../../../services/rest/savedObjects';
import { getRenderedHref } from '../../../../../utils/testHelpers';
import { DiscoverErrorLink } from '../DiscoverErrorLink';
import { DiscoverSpanLink } from '../DiscoverSpanLink';
import { DiscoverTransactionLink } from '../DiscoverTransactionLink';

jest
  .spyOn(savedObjects, 'getAPMIndexPattern')
  .mockReturnValue(
    Promise.resolve({ id: 'apm-index-pattern-id' } as savedObjects.ISavedObject)
  );

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => null);
});

afterAll(() => {
  jest.restoreAllMocks();
});

test('DiscoverTransactionLink should produce the correct URL', async () => {
  const transaction = {
    transaction: {
      id: '8b60bd32ecc6e150'
    },
    trace: {
      id: '8b60bd32ecc6e1506735a8b6cfcf175c'
    }
  } as Transaction;

  const href = await getRenderedHref(
    () => <DiscoverTransactionLink transaction={transaction} />,
    {
      search: '?rangeFrom=now/w&rangeTo=now'
    } as Location
  );

  expect(href).toEqual(
    `/app/kibana#/discover?_g=(refreshInterval:(pause:true,value:'0'),time:(from:now%2Fw,to:now))&_a=(index:apm-index-pattern-id,interval:auto,query:(language:lucene,query:'processor.event:"transaction" AND transaction.id:"8b60bd32ecc6e150" AND trace.id:"8b60bd32ecc6e1506735a8b6cfcf175c"'))`
  );
});

test('DiscoverSpanLink should produce the correct URL', async () => {
  const span = {
    span: {
      id: 'test-span-id'
    }
  } as Span;

  const href = await getRenderedHref(() => <DiscoverSpanLink span={span} />, {
    search: '?rangeFrom=now/w&rangeTo=now'
  } as Location);

  expect(href).toEqual(
    `/app/kibana#/discover?_g=(refreshInterval:(pause:true,value:'0'),time:(from:now%2Fw,to:now))&_a=(index:apm-index-pattern-id,interval:auto,query:(language:lucene,query:'span.id:"test-span-id"'))`
  );
});

test('DiscoverErrorLink should produce the correct URL', async () => {
  const error = {
    service: {
      name: 'service-name'
    },
    error: {
      grouping_key: 'grouping-key'
    }
  } as APMError;
  const href = await getRenderedHref(
    () => <DiscoverErrorLink error={error} />,
    {
      search: '?rangeFrom=now/w&rangeTo=now'
    } as Location
  );

  expect(href).toEqual(
    `/app/kibana#/discover?_g=(refreshInterval:(pause:true,value:'0'),time:(from:now%2Fw,to:now))&_a=(index:apm-index-pattern-id,interval:auto,query:(language:lucene,query:'service.name:"service-name" AND error.grouping_key:"grouping-key"'),sort:('@timestamp':desc))`
  );
});

test('DiscoverErrorLink should include optional kuery string in URL', async () => {
  const error = {
    service: {
      name: 'service-name'
    },
    error: {
      grouping_key: 'grouping-key'
    }
  } as APMError;

  const href = await getRenderedHref(
    () => <DiscoverErrorLink error={error} kuery="some:kuery-string" />,
    {
      search: '?rangeFrom=now/w&rangeTo=now'
    } as Location
  );

  expect(href).toEqual(
    `/app/kibana#/discover?_g=(refreshInterval:(pause:true,value:'0'),time:(from:now%2Fw,to:now))&_a=(index:apm-index-pattern-id,interval:auto,query:(language:lucene,query:'service.name:"service-name" AND error.grouping_key:"grouping-key" AND some:kuery-string'),sort:('@timestamp':desc))`
  );
});
