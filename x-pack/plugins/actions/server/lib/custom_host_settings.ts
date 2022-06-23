/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { Logger } from '@kbn/core/server';
import { ActionsConfig, CustomHostSettings } from '../config';

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

type ActionsConfigWriteable = DeepWriteable<ActionsConfig>;
type CustomHostSettingsWriteable = DeepWriteable<CustomHostSettings>;

export function getCanonicalCustomHostUrl(url: URL): string {
  const port = getActualPort(url.protocol, url.port);

  return `${url.protocol}//${url.hostname}:${port}`;
}

const ErrorPrefix = 'In configuration xpack.actions.customHosts,';
const ValidProtocols = new Set(['https:', 'smtp:']);
const ProtocolsForSmtp = new Set(['smtp:']);

// converts the custom host data in config, for ease of use, and to perform
// validation we can't do in config-schema, since the cloud validation can't
// do these sorts of validations
export function resolveCustomHosts(logger: Logger, config: ActionsConfig): ActionsConfig {
  const result: ActionsConfigWriteable = cloneDeep(config);

  if (!result.customHostSettings) {
    return result as ActionsConfig;
  }

  const savedSettings: CustomHostSettingsWriteable[] = [];

  for (const customHostSetting of result.customHostSettings) {
    const originalUrl = customHostSetting.url;
    let parsedUrl: URL | undefined;
    try {
      parsedUrl = new URL(originalUrl);
    } catch (err) {
      logger.warn(`${ErrorPrefix} invalid URL "${originalUrl}", ignoring; error: ${err.message}`);
      continue;
    }

    customHostSetting.url = getCanonicalCustomHostUrl(parsedUrl);

    if (!ValidProtocols.has(parsedUrl.protocol)) {
      logger.warn(`${ErrorPrefix} unsupported protocol used in URL "${originalUrl}", ignoring`);
      continue;
    }

    const port = getActualPort(parsedUrl.protocol, parsedUrl.port);
    if (!port) {
      logger.warn(`${ErrorPrefix} unable to determine port for URL "${originalUrl}", ignoring`);
      continue;
    }

    if (parsedUrl.username || parsedUrl.password) {
      logger.warn(
        `${ErrorPrefix} URL "${originalUrl}" contains authentication information which will be ignored, but should be removed from the configuration`
      );
    }

    if (parsedUrl.hash) {
      logger.warn(
        `${ErrorPrefix} URL "${originalUrl}" contains hash information which will be ignored`
      );
    }

    if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
      logger.warn(
        `${ErrorPrefix} URL "${originalUrl}" contains path information which will be ignored`
      );
    }

    if (!ProtocolsForSmtp.has(parsedUrl.protocol) && customHostSetting.smtp) {
      logger.warn(
        `${ErrorPrefix} URL "${originalUrl}" contains smtp properties but does not use smtp; ignoring smtp properties`
      );
      delete customHostSetting.smtp;
    }

    // read the specified ca files, add their content to certificateAuthoritiesData
    if (customHostSetting.ssl) {
      let files = customHostSetting.ssl?.certificateAuthoritiesFiles || [];
      if (typeof files === 'string') {
        files = [files];
      }
      for (const file of files) {
        const contents = getFileContents(logger, file);
        if (contents) {
          appendToCertificateAuthoritiesData(customHostSetting, contents);
        }
      }
    }

    const customSmtpSettings = customHostSetting.smtp;
    if (customSmtpSettings) {
      if (customSmtpSettings.requireTLS && customSmtpSettings.ignoreTLS) {
        logger.warn(
          `${ErrorPrefix} URL "${originalUrl}" cannot have both requireTLS and ignoreTLS set to true; using requireTLS: true and ignoreTLS: false`
        );
        customSmtpSettings.requireTLS = true;
        customSmtpSettings.ignoreTLS = false;
      }
    }

    savedSettings.push(customHostSetting);
  }

  // check to see if there are any dups on the url
  const existingUrls = new Set<string>();
  for (const customHostSetting of savedSettings) {
    const url = customHostSetting.url;
    if (existingUrls.has(url)) {
      logger.warn(
        `${ErrorPrefix} multiple URLs match the canonical url "${url}"; only the first will be used`
      );
      // mark this entry to be able to delete it after processing them all
      customHostSetting.url = '';
    }
    existingUrls.add(url);
  }

  // remove the settings we want to skip
  result.customHostSettings = savedSettings.filter((setting) => setting.url !== '');

  return result as ActionsConfig;
}

function appendToCertificateAuthoritiesData(customHost: CustomHostSettingsWriteable, cert: string) {
  const ssl = customHost.ssl;
  if (ssl) {
    if (!ssl.certificateAuthoritiesData) {
      ssl.certificateAuthoritiesData = cert;
    } else {
      ssl.certificateAuthoritiesData += '\n' + cert;
    }
  }
}

function getFileContents(logger: Logger, fileName: string): string | undefined {
  try {
    return readFileSync(fileName, 'utf8');
  } catch (err) {
    logger.warn(
      `error reading file "${fileName}" specified in xpack.actions.customHosts, ignoring: ${err.message}`
    );
    return;
  }
}

// 0 isn't a valid port, so result can be checked as falsy
function getActualPort(protocol: string, port: string): number {
  if (port !== '') {
    const portNumber = parseInt(port, 10);
    if (isNaN(portNumber)) {
      return 0;
    }
    return portNumber;
  }

  // from https://nodejs.org/dist/latest-v14.x/docs/api/url.html#url_url_port
  if (protocol === 'http:') return 80;
  if (protocol === 'https:') return 443;
  if (protocol === 'smtp:') return 25;
  return 0;
}
