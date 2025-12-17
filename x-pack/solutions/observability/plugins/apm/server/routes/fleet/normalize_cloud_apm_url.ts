/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';

function toStringWithoutTrailingSlash(url: URL) {
  return url.toString().replace(/\/$/, '');
}

function safeParseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function deriveApmUrlFromKibanaUrl({
  kibanaUrl,
  configuredApmUrl,
}: {
  kibanaUrl?: string;
  configuredApmUrl: URL;
}): string | undefined {
  if (!kibanaUrl) {
    return undefined;
  }

  const parsedKibanaUrl = safeParseUrl(kibanaUrl);
  if (!parsedKibanaUrl) {
    return undefined;
  }

  const hostname = parsedKibanaUrl.hostname;
  const separator = hostname.includes('.kb.')
    ? '.kb.'
    : hostname.includes('.kibana.')
    ? '.kibana.'
    : '';
  if (!separator) {
    return undefined;
  }

  const [, suffix] = hostname.split(separator);
  if (!suffix || !configuredApmUrl.hostname.endsWith(suffix)) {
    return undefined;
  }

  parsedKibanaUrl.hostname = hostname.replace(separator, '.apm.');
  return parsedKibanaUrl.origin;
}

function deriveApmUrlByInsertingApmSegment(configuredApmUrl: URL): string | undefined {
  const hostname = configuredApmUrl.hostname;

  if (hostname.includes('.apm.')) {
    return toStringWithoutTrailingSlash(configuredApmUrl);
  }

  // Avoid producing invalid hostnames for already component-specific hosts.
  if (hostname.includes('.kb.') || hostname.includes('.kibana.')) {
    return undefined;
  }

  const parts = hostname.split('.');
  if (parts.length < 2) {
    return undefined;
  }

  configuredApmUrl.hostname = [parts[0], 'apm', ...parts.slice(1)].join('.');
  return toStringWithoutTrailingSlash(configuredApmUrl);
}

function getHostname(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  return safeParseUrl(url)?.hostname;
}

export function getNormalizedCloudApmUrl(cloudPluginSetup?: CloudSetup): string | undefined {
  const apmUrl = cloudPluginSetup?.apm?.url;

  if (!cloudPluginSetup?.isCloudEnabled || !apmUrl) {
    return apmUrl;
  }

  if (apmUrl.includes('.apm.')) {
    return apmUrl;
  }

  const parsedApmUrl = safeParseUrl(apmUrl);
  if (!parsedApmUrl) {
    return apmUrl;
  }

  const derivedFromKibanaUrl = deriveApmUrlFromKibanaUrl({
    kibanaUrl: cloudPluginSetup.kibanaUrl,
    configuredApmUrl: parsedApmUrl,
  });
  if (derivedFromKibanaUrl) {
    return derivedFromKibanaUrl;
  }

  const apmHostname = parsedApmUrl.hostname;
  const elasticsearchHostname = getHostname(cloudPluginSetup.elasticsearchUrl);
  const isDefinitelyWrong = !!(
    elasticsearchHostname &&
    apmHostname &&
    apmHostname === elasticsearchHostname
  );

  if (!isDefinitelyWrong) {
    return apmUrl;
  }

  return deriveApmUrlByInsertingApmSegment(parsedApmUrl) ?? apmUrl;
}
