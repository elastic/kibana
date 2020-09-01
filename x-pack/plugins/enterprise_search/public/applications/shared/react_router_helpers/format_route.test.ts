/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatRoute } from './';

const ROUTE = '/foo/:id/bar/:baz';

describe('formatRoute', () => {
  it('should format route', () => {
    const path = formatRoute(ROUTE, { id: 123, baz: 'yes' });

    expect(path).toEqual('/foo/123/bar/yes');
  });

  it('should return key names no values present', () => {
    const path = formatRoute(ROUTE, {});

    expect(path).toEqual('/foo/:id/bar/:baz');
  });
});
