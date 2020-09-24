/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch, { FetchError, Response, RequestInit } from 'node-fetch';
import pRetry from 'p-retry';
import HttpProxyAgent from 'http-proxy-agent';
import type { HttpsProxyAgent as IHttpsProxyAgent } from 'https-proxy-agent';
import HttpsProxyAgent from 'https-proxy-agent';
import { getProxyForUrl as getProxyFromEnvForUrl } from 'proxy-from-env';
import { streamToString } from './streams';
import { appContextService } from '../../app_context';
import { RegistryError, RegistryConnectionError, RegistryResponseError } from '../../../errors';

type FailedAttemptErrors = pRetry.FailedAttemptError | FetchError | Error;

// not sure what to call this function, but we're not exporting it
async function registryFetch(url: string) {
  const response = await fetch(url, getFetchOptions(url));
  if (response.ok) {
    return response;
  } else {
    // 4xx & 5xx responses
    const { status, statusText, url: resUrl } = response;
    const message = `'${status} ${statusText}' error response from package registry at ${
      resUrl || url
    }`;
    const responseError = new RegistryResponseError(message);

    throw new pRetry.AbortError(responseError);
  }
}

export async function getResponse(url: string): Promise<Response> {
  try {
    // we only want to retry certain failures like network issues
    // the rest should only try the one time then fail as they do now
    const response = await pRetry(() => registryFetch(url), {
      factor: 2,
      retries: 5,
      onFailedAttempt: (error) => {
        // we only want to retry certain types of errors, like `ECONNREFUSED` and other operational errors
        // and let the others through without retrying
        //
        // throwing in onFailedAttempt will abandon all retries & fail the request
        // we only want to retry system errors, so re-throw for everything else
        if (!isSystemError(error)) {
          throw error;
        }
      },
    });
    return response;
  } catch (error) {
    // isSystemError here means we didn't succeed after max retries
    if (isSystemError(error)) {
      throw new RegistryConnectionError(`Error connecting to package registry: ${error.message}`);
    }
    // don't wrap our own errors
    if (error instanceof RegistryError) {
      throw error;
    } else {
      throw new RegistryError(error);
    }
  }
}

export async function getResponseStream(url: string): Promise<NodeJS.ReadableStream> {
  const res = await getResponse(url);
  return res.body;
}

export async function fetchUrl(url: string): Promise<string> {
  return getResponseStream(url).then(streamToString);
}

// node-fetch throws a FetchError for those types of errors and
// "All errors originating from Node.js core are marked with error.type = 'system'"
// https://github.com/node-fetch/node-fetch/blob/master/docs/ERROR-HANDLING.md#error-handling-with-node-fetch
function isFetchError(error: FailedAttemptErrors): error is FetchError {
  return error instanceof FetchError || error.name === 'FetchError';
}

function isSystemError(error: FailedAttemptErrors): boolean {
  return isFetchError(error) && error.type === 'system';
}

type ProxyAgent = IHttpsProxyAgent | HttpProxyAgent;
export function getFetchOptions(url: string): RequestInit | {} {
  // start with env values and can add from flags, defaults, etc later
  const proxyUrl = getProxyFromEnvForUrl(url);
  if (!proxyUrl) {
    return {};
  }

  const logger = appContextService.getLogger();
  logger.info(`Using proxy ${proxyUrl} from environment variable`);

  return {
    agent: getProxyAgent(proxyUrl, url),
  };
}

export function getProxyAgent(proxyUrl: string, endpointUrl: string): ProxyAgent {
  const endpointParsed = new URL(endpointUrl);
  const proxyParsed = new URL(proxyUrl);

  const agentOptions = {
    host: proxyParsed.hostname,
    port: Number(proxyParsed.port),
    protocol: proxyParsed.protocol,
    // the proxied URL's host is put in the header instead of the server's actual host
    // headers: proxySettings.proxyHeaders,
    headers: {
      Host: endpointParsed.host,
    },
    // rejectUnauthorized: proxySettings.proxyRejectUnauthorizedCertificates,
  };

  const isHttps = endpointParsed.protocol === 'https:';
  const agent: ProxyAgent = isHttps
    ? // @ts-expect-error ts(7009) HttpsProxyAgent isn't a class so TS complains about using `new`
      new HttpsProxyAgent(agentOptions)
    : new HttpProxyAgent(proxyUrl);

  return agent;
}
