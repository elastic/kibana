/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { UrlDrilldownConfig, UrlDrilldownScope } from './types';
import { compile } from './url_template';

const generalFormatError = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.urlDrilldownValidation.urlFormatGeneralErrorMessage',
  {
    defaultMessage: 'Invalid format. Example: {exampleUrl}',
    values: {
      exampleUrl: 'https://www.my-url.com/?{{event.key}}={{event.value}}',
    },
  }
);

const formatError = (message: string) =>
  i18n.translate(
    'xpack.uiActionsEnhanced.drilldowns.urlDrilldownValidation.urlFormatErrorMessage',
    {
      defaultMessage: 'Invalid format: {message}',
      values: {
        message,
      },
    }
  );

const SAFE_URL_PATTERN = /^(?:(?:https?|mailto):|[^&:/?#]*(?:[/?#]|$))/gi;
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url)
    return {
      isValid: false,
      error: generalFormatError,
    };

  try {
    new URL(url);
    if (!url.match(SAFE_URL_PATTERN)) throw new Error();
    return { isValid: true };
  } catch (e) {
    return {
      isValid: false,
      error: generalFormatError,
    };
  }
}

export async function validateUrlTemplate(
  urlTemplate: UrlDrilldownConfig['url'],
  scope: UrlDrilldownScope
): Promise<{ isValid: boolean; error?: string }> {
  if (!urlTemplate.template)
    return {
      isValid: false,
      error: generalFormatError,
    };

  try {
    const compiledUrl = await compile(urlTemplate.template, scope);
    return validateUrl(compiledUrl);
  } catch (e) {
    return {
      isValid: false,
      error: formatError(e.message),
    };
  }
}
