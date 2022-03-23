/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChatContext } from './get_chat_context';

const PROTOCOL = 'http:';
const PORT = '1234';
const HASH = '#/discover?_g=()&_a=()';
const HOST_NAME = 'www.kibana.com';
const PATH_NAME = '/app/kibana';
const HOST = `${HOST_NAME}:${PORT}`;
const ORIGIN = `${PROTOCOL}//${HOST}`;
const HREF = `${ORIGIN}${PATH_NAME}${HASH}`;
const USER_AGENT = 'user-agent';
const LANGUAGE = 'la-ng';
const TITLE = 'title';
const REFERRER = 'referrer';

describe('getChatContext', () => {
  const url = new URL(HREF);

  test('retreive the context', () => {
    Object.defineProperty(window, 'location', { value: url });
    Object.defineProperty(window, 'navigator', {
      value: {
        language: LANGUAGE,
        userAgent: USER_AGENT,
      },
    });
    Object.defineProperty(window.document, 'referrer', { value: REFERRER });
    window.document.title = TITLE;

    const context = getChatContext();

    expect(context).toStrictEqual({
      window: {
        location: {
          hash: HASH,
          host: HOST,
          hostname: HOST_NAME,
          href: HREF,
          origin: ORIGIN,
          pathname: PATH_NAME,
          port: PORT,
          protocol: PROTOCOL,
          search: '',
        },
        navigator: {
          language: LANGUAGE,
          userAgent: USER_AGENT,
        },
        innerHeight: 768,
        innerWidth: 1024,
      },
      document: {
        title: TITLE,
        referrer: REFERRER,
      },
    });
  });
});
