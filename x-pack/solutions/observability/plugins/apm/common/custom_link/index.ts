/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import Mustache from 'mustache';
import type { Transaction } from '../../typings/es_schemas/ui/transaction';

export const INVALID_LICENSE = i18n.translate('xpack.apm.settings.customLink.license.text', {
  defaultMessage:
    "To create custom links, you must be subscribed to an Elastic Gold license or above. With it, you'll have the ability to create custom links to improve your workflow when analyzing your services.",
});

export const NO_PERMISSION_LABEL = i18n.translate(
  'xpack.apm.settings.customLink.noPermissionTooltipLabel',
  {
    defaultMessage: "Your user role doesn't have permissions to create custom links",
  }
);

export const extractTemplateVariableNames = (url: string): string[] => {
  const uniqueVariableNames = new Set<string>();
  Mustache.parse(url)
    .filter((v: any[]) => v[0] === 'name')
    .map((v: any[]) => uniqueVariableNames.add(v[1]));
  return Array.from(uniqueVariableNames);
};

/**
 * Checks if a value is a valid HTTP or HTTPS URL.
 * Only URLs with http:// or https:// protocols are considered valid.
 * Other protocols (ftp://, file://, etc.) will return false.
 *
 * @param value - The string value to check
 * @returns true if the value is a valid http/https URL, false otherwise
 */
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    // Only consider http and https URLs as valid URLs that shouldn't be encoded
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getEncodedCustomLinkUrl(url: string, transaction?: Transaction) {
  try {
    const templateVariables = extractTemplateVariableNames(url);
    const encodedTemplateVariables: Record<string, any> = {};
    templateVariables.forEach((name) => {
      const value = get(transaction, name);
      if (value) {
        const stringValue = String(value);
        // Don't encode if the value is a valid URL (http:// or https://)
        const encodedValue = isValidUrl(stringValue)
          ? stringValue
          : encodeURIComponent(stringValue);
        set(encodedTemplateVariables, name, encodedValue);
      }
    });
    return Mustache.render(url, encodedTemplateVariables);
  } catch (e) {
    return url;
  }
}
