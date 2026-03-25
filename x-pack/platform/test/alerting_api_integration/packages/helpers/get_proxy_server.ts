/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import httpProxy from 'http-proxy';

function getProxyBasicAuthFromServerArgs(
  kbnTestServerConfig: string[]
): { user: string; password: string } | undefined {
  const userLine = kbnTestServerConfig.find((val: string) =>
    val.startsWith('--xpack.actions.proxyUser=')
  );
  const passLine = kbnTestServerConfig.find((val: string) =>
    val.startsWith('--xpack.actions.proxyPassword=')
  );
  if (!userLine || !passLine) {
    return undefined;
  }

  const result = {
    user: userLine.replace('--xpack.actions.proxyUser=', ''),
    password: passLine.replace('--xpack.actions.proxyPassword=', ''),
  };
  // eslint-disable-next-line no-console
  console.log(`Proxy basic auth credentials: ${result.user}:${result.password}`);
  return result;
}

export const getHttpProxyServer = async (
  targetUrl: string,
  kbnTestServerConfig: string[],
  onProxyResHandler: (proxyRes?: unknown, req?: unknown, res?: unknown) => void
): Promise<httpProxy> => {
  const proxyServer = httpProxy.createProxyServer({
    target: targetUrl,
    secure: false,
    selfHandleResponse: false,
  });

  proxyServer.on('proxyRes', (proxyRes: unknown, req: unknown, res: unknown) => {
    onProxyResHandler(proxyRes, req, res);
  });

  proxyServer.on('proxyReq', (proxyReq, req, res) => {
    res.on('close', () => {
      if (!res.writableFinished) {
        proxyReq.destroy();
      }
    });
  });

  const proxyPort = getProxyPort(kbnTestServerConfig);
  const basicAuth = getProxyBasicAuthFromServerArgs(kbnTestServerConfig);

  if (basicAuth) {
    const expectedAuth = `Basic ${Buffer.from(
      `${basicAuth.user}:${basicAuth.password}`,
      'utf8'
    ).toString('base64')}`;
    const server = http.createServer((req, res) => {
      if (req.headers['proxy-authorization'] !== expectedAuth) {
        res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="proxy"' });
        res.end();
        return;
      }
      proxyServer.web(req, res);
    });
    server.listen(proxyPort);
    return server as unknown as httpProxy;
  }

  proxyServer.listen(proxyPort);

  return proxyServer;
};

export const getProxyPort = (kbnTestServerConfig: string[]): number => {
  const proxyUrl = kbnTestServerConfig
    .find((val: string) => val.startsWith('--xpack.actions.proxyUrl='))
    ?.replace('--xpack.actions.proxyUrl=', '');

  if (!proxyUrl) {
    throw new Error('Expected --xpack.actions.proxyUrl= in kbn test server args');
  }

  const urlObject = new URL(proxyUrl);
  return Number(urlObject.port);
};
