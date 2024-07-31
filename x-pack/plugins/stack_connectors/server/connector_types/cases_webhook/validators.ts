/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { isEmpty } from 'lodash';
import * as i18n from './translations';
import { CasesWebhookPublicConfigurationType, CasesWebhookSecretConfigurationType } from './types';

export const validateCasesWebhookConfig = (
  configObject: CasesWebhookPublicConfigurationType,
  validatorServices: ValidatorServices
) => {
  const { configurationUtilities } = validatorServices;
  const {
    createCommentUrl,
    createIncidentUrl,
    viewIncidentUrl,
    getIncidentUrl,
    updateIncidentUrl,
  } = configObject;

  const urls = [
    createIncidentUrl,
    createCommentUrl,
    viewIncidentUrl,
    getIncidentUrl,
    updateIncidentUrl,
  ];

  for (const url of urls) {
    if (url) {
      try {
        new URL(url);
      } catch (err) {
        throw new Error(i18n.INVALID_URL(err, url));
      }
      try {
        configurationUtilities.ensureUriAllowed(url);
      } catch (allowListError) {
        throw new Error(i18n.CONFIG_ERR(allowListError.message));
      }
    }
  }
};

export const validateConnector = (
  configObject: CasesWebhookPublicConfigurationType,
  secrets: CasesWebhookSecretConfigurationType
): string | null => {
  if (configObject.hasAuth && isEmpty(secrets)) return i18n.INVALID_AUTH;
  return null;
};

const validProtocols: string[] = ['http:', 'https:'];
export const assertURL = (url: string) => {
  try {
    const parsedUrl = new URL(url);

    if (!parsedUrl.hostname) {
      throw new Error(`URL must contain hostname`);
    }

    if (!validProtocols.includes(parsedUrl.protocol)) {
      throw new Error(`Invalid protocol`);
    }
  } catch (error) {
    throw new Error(`${error.message}`);
  }
};
export const ensureUriAllowed = (
  url: string,
  configurationUtilities: ActionsConfigurationUtilities
) => {
  try {
    configurationUtilities.ensureUriAllowed(url);
  } catch (allowedListError) {
    throw Error(`${i18n.ALLOWED_HOSTS_ERROR(allowedListError.message)}`);
  }
};
export const normalizeURL = (url: string) => {
  const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
  const replaceDoubleSlashesRegex = new RegExp('([^:]/)/+', 'g');
  return urlWithoutTrailingSlash.replace(replaceDoubleSlashesRegex, '$1');
};

export const validateAndNormalizeUrl = (
  url: string,
  configurationUtilities: ActionsConfigurationUtilities,
  urlDesc: string
) => {
  try {
    assertURL(url);
    ensureUriAllowed(url, configurationUtilities);
    return normalizeURL(url);
  } catch (e) {
    throw Error(`Invalid ${urlDesc}: ${e}`);
  }
};

export const validateJson = (jsonString: string, jsonDesc: string) => {
  try {
    JSON.parse(jsonString);
  } catch (e) {
    throw new Error(`JSON Error: ${jsonDesc} must be valid JSON`);
  }
};
