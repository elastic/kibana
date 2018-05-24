/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import { Server } from 'hapi';
import { initSelectedSpaceState, setSelectedSpace } from './selected_space_state';
import { SELECTED_SPACE_COOKIE } from '../../common';

function getCookiePartsFromResponse(response) {
  const { headers } = response;
  expect(headers).toHaveProperty('set-cookie');

  const cookies = headers['set-cookie'];
  expect(cookies).toHaveLength(1);

  return cookies[0].split(';').map(a => a.trim());
}

describe('initSelectedSpaceState', () => {
  const sandbox = sinon.sandbox.create();
  const teardowns = [];
  let request;

  beforeEach(() => {
    teardowns.push(() => sandbox.restore());
    request = async (config, setupFn = () => { }) => {

      const server = new Server();

      server.connection({ port: 0 });

      initSelectedSpaceState(server, {
        get: (key) => {
          return config[key];
        }
      });

      server.route({
        method: 'GET',
        path: '/',
        handler: (req, reply) => {
          return reply({ path: req.path, url: req.url });
        }
      });

      server.ext('onPreResponse', (req, reply) => {
        reply.state(SELECTED_SPACE_COOKIE, 'foo');
        return reply.continue();
      });

      await setupFn(server);

      teardowns.push(() => server.stop());

      const response = await server.inject({
        method: 'GET',
        url: '/',
      });

      if (response && response.isBoom) {
        throw response;
      }

      return response;
    };
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  describe('Secure Flag', () => {
    const values = [true, false];
    values.forEach(v => {
      test(`it ${v ? 'sets' : 'does not set'} the Secure flag when server ssl is ${v ? 'enabled' : 'disabled'}`, async () => {
        const config = {
          'server.ssl.enabled': v,
          'server.basePath': null,
          'xpack.spaces.rememberSelectedSpace': true,
        };

        const response = await request(config);

        const [nameValuePair, ...rest] = getCookiePartsFromResponse(response);

        expect(nameValuePair).toEqual('selectedSpace=foo');
        if (v) {
          expect(rest).toContain('Secure');
        } else {
          expect(rest).not.toContain('Secure');
        }
      });
    });
  });

  test('it sets the httpOnly flag', async () => {
    const config = {
      'server.ssl.enabled': true,
      'server.basePath': null,
      'xpack.spaces.rememberSelectedSpace': true,
    };

    const response = await request(config);
    const attributes = getCookiePartsFromResponse(response);
    expect(attributes).toContain('HttpOnly');
  });

  test('it sets the cookie path based on the servers basePath', async () => {
    const config = {
      'server.ssl.enabled': true,
      'server.basePath': '/foo/bar',
      'xpack.spaces.rememberSelectedSpace': true,
    };

    const response = await request(config);

    const attributes = getCookiePartsFromResponse(response);
    expect(attributes).toContain('Path=/foo/bar');
  });
});

describe('setSelectedSpace', () => {
  const sandbox = sinon.sandbox.create();
  const teardowns = [];

  const serverConfig = {
    'server.ssl.enabled': true,
    'server.basePath': null,
    'xpack.spaces.rememberSelectedSpace': true,
  };

  let request;

  beforeEach(() => {
    teardowns.push(() => sandbox.restore());
    request = async (config, replyHandler = () => { }, reqHeaders = {}) => {

      const server = new Server();

      server.connection({ port: 0 });

      initSelectedSpaceState(server, {
        get: (key) => {
          return config[key];
        }
      });

      server.route({
        method: 'GET',
        path: '/',
        handler: (req, reply) => {
          replyHandler(req, reply);
          return reply({ path: req.path, url: req.url });
        }
      });

      teardowns.push(() => server.stop());

      const response = await server.inject({
        method: 'GET',
        url: '/',
        headers: reqHeaders
      });

      if (response && response.isBoom) {
        throw response;
      }
      return response;
    };
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  test('it sets the selected space cookie', async () => {
    const response = await request(serverConfig, (req, rep) => {
      setSelectedSpace(req, rep, 'url-context');
    });

    const [nameValuePair] = getCookiePartsFromResponse(response);
    expect(nameValuePair).toEqual('selectedSpace=url-context');
  });

  test('it does not set the selected space if it is already set to that value', async () => {
    const requestHeaders = {
      'Cookie': 'selectedSpace=url-context'
    };

    const response = await request(serverConfig, (req, rep) => {
      setSelectedSpace(req, rep, 'url-context');
    }, requestHeaders);

    const { headers } = response;
    expect(headers).not.toHaveProperty('set-cookie');
  });

  test('it overwrites the selected space if it has changed', async () => {
    const requestHeaders = {
      'Cookie': 'selectedSpace=original-url-context'
    };

    const response = await request(serverConfig, (req, rep) => {
      setSelectedSpace(req, rep, 'new-url-context');
    }, requestHeaders);

    const [nameValuePair] = getCookiePartsFromResponse(response);
    expect(nameValuePair).toEqual('selectedSpace=new-url-context');
  });

  test('it sets the selected space even if the url context is empty', async () => {
    const response = await request(serverConfig, (req, rep) => {
      setSelectedSpace(req, rep, '');
    });

    const [nameValuePair] = getCookiePartsFromResponse(response);
    expect(nameValuePair).toEqual('selectedSpace=');
  });

  test('it does not set the selected space if the url context is undefined', async () => {
    const response = await request(serverConfig, (req, rep) => {
      setSelectedSpace(req, rep);
    });

    const { headers } = response;
    expect(headers).not.toHaveProperty('set-cookie');
  });

  test('it does not set the selected space if the feature is turned off', async () => {
    const config = {
      ...serverConfig,
      'xpack.spaces.rememberSelectedSpace': false
    };

    const response = await request(config, (req, rep) => {
      setSelectedSpace(req, rep, 'url-context');
    });

    const { headers } = response;
    expect(headers).not.toHaveProperty('set-cookie');
  });
});
