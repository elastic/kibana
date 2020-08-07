/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routes } from './';

describe('routes', () => {
  describe('/', () => {
    const route = routes.find((r) => r.path === '/');

    describe('with no hash path', () => {
      it('redirects to /services', () => {
        const location = { hash: '', pathname: '/', search: '' };
        expect(
          (route as any).render({ location } as any).props.to.pathname
        ).toEqual('/services');
      });
    });

    describe('with a hash path', () => {
      it('redirects to the hash path', () => {
        const location = {
          hash:
            '#/services/opbeans-python/transactions/view?rangeFrom=now-24h&rangeTo=now&refreshInterval=10000&refreshPaused=false&traceId=d919c89dc7ca48d84b9dde1fef01d1f8&transactionId=1b542853d787ba7b&transactionName=GET%20opbeans.views.product_customers&transactionType=request&flyoutDetailTab=&waterfallItemId=1b542853d787ba7b',
          pathname: '',
          search: '',
        };

        expect(((route as any).render({ location }) as any).props.to).toEqual({
          hash: '',
          pathname: '/services/opbeans-python/transactions/view',
          search:
            '?rangeFrom=now-24h&rangeTo=now&refreshInterval=10000&refreshPaused=false&traceId=d919c89dc7ca48d84b9dde1fef01d1f8&transactionId=1b542853d787ba7b&transactionName=GET%20opbeans.views.product_customers&transactionType=request&flyoutDetailTab=&waterfallItemId=1b542853d787ba7b',
        });
      });
    });
  });
});
