/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import 'jest-styled-components';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import configureStore from '../../../../../store/config/configureStore';
import { DiscoverTransactionLink } from '../DiscoverTransactionLink';
import { DiscoverSpanLink } from '../DiscoverSpanLink';
import { DiscoverErrorLink } from '../DiscoverErrorLink';

// NOTE: this test file must be a .js file for jest.mock() to work with ts-jest

jest.mock('x-pack/plugins/apm/public/services/rest/savedObjects', () => ({
  getAPMIndexPattern: () => Promise.resolve({ id: 'apm-index-pattern-id' })
}));

async function asyncFlush() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function getRenderedHref(Component) {
  const store = configureStore({
    location: { search: '?rangeFrom=now/w&rangeTo=now' }
  });
  const mounted = mount(
    <Provider store={store}>
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    </Provider>
  );

  await asyncFlush();

  return mounted.render().attr('href');
}

test('DiscoverTransactionLink should produce the correct URL', async () => {
  const transaction = {
    transaction: {
      id: '8b60bd32ecc6e150'
    },
    trace: {
      id: '8b60bd32ecc6e1506735a8b6cfcf175c'
    }
  };
  const href = await getRenderedHref(() => (
    <DiscoverTransactionLink transaction={transaction} />
  ));

  expect(href).toEqual(
    `/app/kibana#/discover?_g=(refreshInterval:(pause:true,value:'0'),time:(from:now%2Fw,to:now))&_a=(index:apm-index-pattern-id,interval:auto,query:(language:lucene,query:'processor.event:"transaction" AND transaction.id:"8b60bd32ecc6e150" AND trace.id:"8b60bd32ecc6e1506735a8b6cfcf175c"'))`
  );
});

test('DiscoverSpanLink should produce the correct URL', async () => {
  const span = {
    span: {
      id: 'test-span-id'
    }
  };
  const href = await getRenderedHref(() => <DiscoverSpanLink span={span} />);

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
  };
  const href = await getRenderedHref(() => <DiscoverErrorLink error={error} />);

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
  };
  const href = await getRenderedHref(() => (
    <DiscoverErrorLink error={error} kuery="some:kuery-string" />
  ));

  expect(href).toEqual(
    `/app/kibana#/discover?_g=(refreshInterval:(pause:true,value:'0'),time:(from:now%2Fw,to:now))&_a=(index:apm-index-pattern-id,interval:auto,query:(language:lucene,query:'service.name:"service-name" AND error.grouping_key:"grouping-key" AND some:kuery-string'),sort:('@timestamp':desc))`
  );
});
