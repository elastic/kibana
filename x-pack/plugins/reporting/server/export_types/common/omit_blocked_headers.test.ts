/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omitBlockedHeaders } from './index';

test(`omits blocked headers`, async () => {
  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const blockedHeaders = {
    'accept-encoding': '',
    connection: 'upgrade',
    'content-length': '',
    'content-type': '',
    host: '',
    'transfer-encoding': '',
    'proxy-connection': 'bananas',
    'proxy-authorization': 'some-base64-encoded-thing',
    trailer: 's are for trucks',
  };

  const filteredHeaders = await omitBlockedHeaders({
    job: {
      title: 'cool-job-bro',
      type: 'csv',
      jobParams: {
        savedObjectId: 'abc-123',
        isImmediate: false,
        savedObjectType: 'search',
      },
    },
    decryptedHeaders: {
      ...permittedHeaders,
      ...blockedHeaders,
    },
  });

  expect(filteredHeaders).toEqual(permittedHeaders);
});
