/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidProtocols } from '../types';

export interface UrlInfo {
  readonly id: string;
  readonly url: string;
  readonly protocol: string;
  readonly hostname: string;
  readonly port: number;
}

export function getUrlInfo(url: string): UrlInfo {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch (err) {
    throw new Error(`error parsing url "${url}"`);
  }

  const { protocol: protocolColon, hostname, port: portString } = parsedUrl;
  const protocol = protocolColon.replace(/:$/, '');
  if (!ValidProtocols.has(protocol)) {
    throw new Error(`invalid protocol "${protocol}"`);
  }

  // will throw on invalid port
  const port = getActualPort(protocol, portString);

  const id = `${protocol}:${hostname}:${port}`;
  const normalizedUrl = `${protocol}://${hostname}:${port}`;

  return { id, url: normalizedUrl, protocol, hostname, port };
}

// 0 isn't a valid port, so result can be checked as a boolean
function getActualPort(protocol: string, port: string): number {
  if (port !== '') {
    const portNumber = parseInt(port, 10);
    if (isNaN(portNumber)) {
      throw new Error(`invalid port number: "${port}"`);
    }
    return portNumber;
  }

  // from https://nodejs.org/dist/latest-v14.x/docs/api/url.html#url_url_port
  if (protocol === 'http') return 80;
  if (protocol === 'https') return 443;
  if (protocol === 'smtp') return 25;
  throw new Error(`invalid protocol to determine default port: "${protocol}"`);
}
