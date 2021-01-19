/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { tryCatch, map, mapNullable, getOrElse } from 'fp-ts/lib/Option';
import url from 'url';
import { curry } from 'lodash';
import { pipe } from 'fp-ts/lib/pipeable';

import { ActionsConfig } from './config';
import { ActionTypeDisabledError } from './lib';
import { ProxySettings } from './types';

export enum AllowedHosts {
  Any = '*',
}

export enum EnabledActionTypes {
  Any = '*',
}

enum AllowListingField {
  URL = 'url',
  hostname = 'hostname',
}

export interface ActionsConfigurationUtilities {
  isHostnameAllowed: (hostname: string) => boolean;
  isUriAllowed: (uri: string) => boolean;
  isActionTypeEnabled: (actionType: string) => boolean;
  ensureHostnameAllowed: (hostname: string) => void;
  ensureUriAllowed: (uri: string) => void;
  ensureActionTypeEnabled: (actionType: string) => void;
  isRejectUnauthorizedCertificatesEnabled: () => boolean;
  getProxySettings: () => undefined | ProxySettings;
}

function allowListErrorMessage(field: AllowListingField, value: string) {
  return i18n.translate('xpack.actions.urlAllowedHostsConfigurationError', {
    defaultMessage:
      'target {field} "{value}" is not added to the Kibana config xpack.actions.allowedHosts',
    values: {
      value,
      field,
    },
  });
}

function disabledActionTypeErrorMessage(actionType: string) {
  return i18n.translate('xpack.actions.disabledActionTypeError', {
    defaultMessage:
      'action type "{actionType}" is not enabled in the Kibana config xpack.actions.enabledActionTypes',
    values: {
      actionType,
    },
  });
}

function isAllowed({ allowedHosts }: ActionsConfig, hostname: string | null): boolean {
  const allowed = new Set(allowedHosts);
  if (allowed.has(AllowedHosts.Any)) return true;
  if (hostname && allowed.has(hostname)) return true;
  return false;
}

function isHostnameAllowedInUri(config: ActionsConfig, uri: string): boolean {
  return pipe(
    tryCatch(() => url.parse(uri)),
    map((parsedUrl) => parsedUrl.hostname),
    mapNullable((hostname) => isAllowed(config, hostname)),
    getOrElse<boolean>(() => false)
  );
}

function isActionTypeEnabledInConfig(
  { enabledActionTypes }: ActionsConfig,
  actionType: string
): boolean {
  const enabled = new Set(enabledActionTypes);
  if (enabled.has(EnabledActionTypes.Any)) return true;
  if (enabled.has(actionType)) return true;
  return false;
}

function getProxySettingsFromConfig(config: ActionsConfig): undefined | ProxySettings {
  if (!config.proxyUrl) {
    return undefined;
  }

  return {
    proxyUrl: config.proxyUrl,
    proxyHeaders: config.proxyHeaders,
    proxyRejectUnauthorizedCertificates: config.proxyRejectUnauthorizedCertificates,
  };
}

export function getActionsConfigurationUtilities(
  config: ActionsConfig
): ActionsConfigurationUtilities {
  const isHostnameAllowed = curry(isAllowed)(config);
  const isUriAllowed = curry(isHostnameAllowedInUri)(config);
  const isActionTypeEnabled = curry(isActionTypeEnabledInConfig)(config);
  return {
    isHostnameAllowed,
    isUriAllowed,
    isActionTypeEnabled,
    getProxySettings: () => getProxySettingsFromConfig(config),
    isRejectUnauthorizedCertificatesEnabled: () => config.rejectUnauthorized,
    ensureUriAllowed(uri: string) {
      if (!isUriAllowed(uri)) {
        throw new Error(allowListErrorMessage(AllowListingField.URL, uri));
      }
    },
    ensureHostnameAllowed(hostname: string) {
      if (!isHostnameAllowed(hostname)) {
        throw new Error(allowListErrorMessage(AllowListingField.hostname, hostname));
      }
    },
    ensureActionTypeEnabled(actionType: string) {
      if (!isActionTypeEnabled(actionType)) {
        throw new ActionTypeDisabledError(disabledActionTypeErrorMessage(actionType), 'config');
      }
    },
  };
}
