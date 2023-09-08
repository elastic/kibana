/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { PingHeaders } from './headers';

describe('Ping Headers', () => {
  const headers = {
    'Content-Type': 'text/html',
    'Content-Length': '174781',
    Expires: 'Mon, 02 Nov 2020 17:22:03 GMT',
    'X-Xss-Protection': '0',
    'Accept-Ranges': 'bytes',
    Date: 'Mon, 02 Nov 2020 17:22:03 GMT',
    'Cache-Control': 'private, max-age=0',
    'Alt-Svc':
      'h3-Q050=":443"; ma=2592000,h3-29=":443"; ma=2592000,h3-T051=":443"; ma=2592000,h3-T050=":443"; ma=2592000,h3-Q046=":443"; ma=2592000,h3-Q043=":443"; ma=2592000,quic=":443"; ma=2592000; v="46,43"',
    Server: 'sffe',
    'Last-Modified': 'Wed, 28 Oct 2020 18:45:00 GMT',
    Vary: 'Accept-Encoding',
    'X-Content-Type-Options': 'nosniff',
  };

  it('shallow renders expected elements for valid props', () => {
    expect(shallowWithIntl(<PingHeaders headers={headers} />)).toMatchSnapshot();
  });
});
