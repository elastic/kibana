/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { tryCatch, map, mapNullable, getOrElse } from 'fp-ts/lib/Option';
import url from 'url';
import { curry } from 'lodash';
import { pipe } from 'fp-ts/lib/pipeable';

import { ActionsConfig, AllowedHosts, EnabledActionTypes, CustomHostSettings } from './config';
import { getCanonicalCustomHostUrl } from './lib/custom_host_settings';
import { ActionTypeDisabledError } from './lib';
import { ProxySettings, ResponseSettings, SSLSettings } from './types';
import { getSSLSettingsFromConfig } from './lib/get_node_ssl_options';
import {
  ValidateEmailAddressesOptions,
  validateEmailAddresses,
  invalidEmailsAsMessage,
} from '../common';
export { AllowedHosts, EnabledActionTypes } from './config';

enum AllowListingField {
  URL = 'url',
  hostname = 'hostname',
}

export const DEFAULT_MAX_ATTEMPTS: number = 3;

export interface ActionsConfigurationUtilities {
  isHostnameAllowed: (hostname: string) => boolean;
  isUriAllowed: (uri: string) => boolean;
  isActionTypeEnabled: (actionType: string) => boolean;
  ensureHostnameAllowed: (hostname: string) => void;
  ensureUriAllowed: (uri: string) => void;
  ensureActionTypeEnabled: (actionType: string) => void;
  getSSLSettings: () => SSLSettings;
  getProxySettings: () => undefined | ProxySettings;
  getResponseSettings: () => ResponseSettings;
  getCustomHostSettings: (targetUrl: string) => CustomHostSettings | undefined;
  getMicrosoftGraphApiUrl: () => undefined | string;
  getMaxAttempts: ({
    actionTypeMaxAttempts,
    actionTypeId,
  }: {
    actionTypeMaxAttempts?: number;
    actionTypeId: string;
  }) => number;
  validateEmailAddresses(
    addresses: string[],
    options?: ValidateEmailAddressesOptions
  ): string | undefined;
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
    tryCatch(() => url.parse(uri, false /* parseQueryString */, true /* slashesDenoteHost */)),
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
    proxyBypassHosts: arrayAsSet(config.proxyBypassHosts),
    proxyOnlyHosts: arrayAsSet(config.proxyOnlyHosts),
    proxyHeaders: config.proxyHeaders,
    proxySSLSettings: getSSLSettingsFromConfig(
      config.ssl?.proxyVerificationMode,
      config.proxyRejectUnauthorizedCertificates
    ),
  };
}

function getMicrosoftGraphApiUrlFromConfig(config: ActionsConfig): undefined | string {
  return config.microsoftGraphApiUrl;
}

function arrayAsSet<T>(arr: T[] | undefined): Set<T> | undefined {
  if (!arr) return;
  return new Set(arr);
}

function getResponseSettingsFromConfig(config: ActionsConfig): ResponseSettings {
  return {
    maxContentLength: config.maxResponseContentLength.getValueInBytes(),
    timeout: config.responseTimeout.asMilliseconds(),
  };
}

function getCustomHostSettings(
  config: ActionsConfig,
  targetUrl: string
): CustomHostSettings | undefined {
  const customHostSettings = config.customHostSettings;
  if (!customHostSettings) {
    return;
  }

  let parsedUrl: URL | undefined;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (err) {
    // presumably this bad URL is reported elsewhere
    return;
  }

  const canonicalUrl = getCanonicalCustomHostUrl(parsedUrl);
  return customHostSettings.find((settings) => settings.url === canonicalUrl);
}

function validateEmails(
  config: ActionsConfig,
  addresses: string[],
  options: ValidateEmailAddressesOptions
): string | undefined {
  if (config.email == null) {
    return;
  }

  const validated = validateEmailAddresses(config.email.domain_allowlist, addresses, options);
  return invalidEmailsAsMessage(validated);
}

export function getActionsConfigurationUtilities(
  config: ActionsConfig
): ActionsConfigurationUtilities {
  const isHostnameAllowed = curry(isAllowed)(config);
  const isUriAllowed = curry(isHostnameAllowedInUri)(config);
  const isActionTypeEnabled = curry(isActionTypeEnabledInConfig)(config);
  const validatedEmailCurried = curry(validateEmails)(config);
  return {
    isHostnameAllowed,
    isUriAllowed,
    isActionTypeEnabled,
    getProxySettings: () => getProxySettingsFromConfig(config),
    getResponseSettings: () => getResponseSettingsFromConfig(config),
    getSSLSettings: () =>
      getSSLSettingsFromConfig(config.ssl?.verificationMode, config.rejectUnauthorized),
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
    getCustomHostSettings: (targetUrl: string) => getCustomHostSettings(config, targetUrl),
    getMicrosoftGraphApiUrl: () => getMicrosoftGraphApiUrlFromConfig(config),
    validateEmailAddresses: (addresses: string[], options: ValidateEmailAddressesOptions) =>
      validatedEmailCurried(addresses, options),
    getMaxAttempts: ({ actionTypeMaxAttempts, actionTypeId }) => {
      const connectorTypeConfig = config.run?.connectorTypeOverrides?.find(
        (connectorType) => actionTypeId === connectorType.id
      );

      return (
        connectorTypeConfig?.maxAttempts ||
        config.run?.maxAttempts ||
        actionTypeMaxAttempts ||
        DEFAULT_MAX_ATTEMPTS
      );
    },
  };
}
