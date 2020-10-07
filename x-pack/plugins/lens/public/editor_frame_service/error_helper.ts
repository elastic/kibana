/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { ExpressionRenderError } from 'src/plugins/expressions/public';

interface RequestError extends Error {
  body?: { attributes?: { error: { caused_by: { type: string; reason: string } } } };
}

const isRequestError = (e: Error | RequestError): e is RequestError => {
  if ('body' in e) {
    return e.body?.attributes?.error?.caused_by !== undefined;
  }
  return false;
};

export function getOriginalRequestErrorMessage(error?: ExpressionRenderError | null) {
  return (
    error &&
    'original' in error &&
    error.original &&
    isRequestError(error.original) &&
    i18n.translate('xpack.lens.editorFrame.expressionFailureMessage', {
      defaultMessage: 'Request error: {causedByType}, {causedByReason}',
      values: {
        causedByType: error.original.body?.attributes?.error?.caused_by.type,
        causedByReason: error.original.body?.attributes?.error?.caused_by.reason,
      },
    })
  );
}
