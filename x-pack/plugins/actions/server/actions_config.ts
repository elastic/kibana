/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { tryCatch, map, mapNullable, getOrElse } from 'fp-ts/lib/Option';
import { URL } from 'url';
import { curry } from 'lodash';
import { pipe } from 'fp-ts/lib/pipeable';

import { ActionsConfigType } from './types';
import { ActionTypeDisabledError } from './lib';

export enum HostsAllowList {
  Any = '*',
}

export enum EnabledActionTypes {
  Any = '*',
}

enum AllowingField {
  url = 'url',
  hostname = 'hostname',
}

export interface ActionsConfigurationUtilities {
  isAllowListedHostname: (hostname: string) => boolean;
  isAllowListedUri: (uri: string) => boolean;
  isActionTypeEnabled: (actionType: string) => boolean;
  ensureAllowListedHostname: (hostname: string) => void;
  ensureAllowListedUri: (uri: string) => void;
  ensureActionTypeEnabled: (actionType: string) => void;
}

function allowingErrorMessage(field: AllowingField, value: string) {
  return i18n.translate('xpack.actions.urlHostsAllowListConfigurationError', {
    defaultMessage:
      'target {field} "{value}" is not present in the Kibana config xpack.actions.hostsAllowList',
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

function isAllowed({ hostsAllowList }: ActionsConfigType, hostname: string): boolean {
  const allowed = new Set(hostsAllowList);
  if (allowed.has(HostsAllowList.Any)) return true;
  if (allowed.has(hostname)) return true;
  return false;
}

function isAllowListedHostnameInUri(config: ActionsConfigType, uri: string): boolean {
  return pipe(
    tryCatch(() => new URL(uri)),
    map((url) => url.hostname),
    mapNullable((hostname) => isAllowListed(config, hostname)),
    getOrElse<boolean>(() => false)
  );
}

function isActionTypeEnabledInConfig(
  { enabledActionTypes }: ActionsConfigType,
  actionType: string
): boolean {
  const enabled = new Set(enabledActionTypes);
  if (enabled.has(EnabledActionTypes.Any)) return true;
  if (enabled.has(actionType)) return true;
  return false;
}

export function getActionsConfigurationUtilities(
  config: ActionsConfigType
): ActionsConfigurationUtilities {
  const isAllowedHostname = curry(isAllowed)(config);
  const isAllowedUri = curry(isAllowListedHostnameInUri)(config);
  const isActionTypeEnabled = curry(isActionTypeEnabledInConfig)(config);
  return {
    isAllowListedHostname,
    isAllowListedUri,
    isActionTypeEnabled,
    ensureAllowListedUri(uri: string) {
      if (!isAllowListedUri(uri)) {
        throw new Error(allowingErrorMessage(AllowingField.url, uri));
      }
    },
    ensureAllowListedHostname(hostname: string) {
      if (!isAllowListedHostname(hostname)) {
        throw new Error(allowingErrorMessage(AllowingField.hostname, hostname));
      }
    },
    ensureActionTypeEnabled(actionType: string) {
      if (!isActionTypeEnabled(actionType)) {
        throw new ActionTypeDisabledError(disabledActionTypeErrorMessage(actionType), 'config');
      }
    },
  };
}
