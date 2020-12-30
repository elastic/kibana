/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { ExpressionRenderError } from 'src/plugins/expressions/public';

interface ElasticsearchErrorClause {
  type: string;
  reason: string;
  caused_by?: ElasticsearchErrorClause;
}

interface RequestError extends Error {
  body?: { attributes?: { error: ElasticsearchErrorClause } };
}

const isRequestError = (e: Error | RequestError): e is RequestError => {
  if ('body' in e) {
    return e.body?.attributes?.error?.caused_by !== undefined;
  }
  return false;
};

function getNestedErrorClause({
  type,
  reason,
  caused_by: causedBy,
}: ElasticsearchErrorClause): { type: string; reason: string } {
  if (causedBy) {
    return getNestedErrorClause(causedBy);
  }
  return { type, reason };
}

export function getOriginalRequestErrorMessage(error?: ExpressionRenderError | null) {
  if (error && 'original' in error && error.original && isRequestError(error.original)) {
    const rootError = getNestedErrorClause(error.original.body!.attributes!.error);
    if (rootError.reason && rootError.type) {
      return i18n.translate('xpack.lens.editorFrame.expressionFailureMessage', {
        defaultMessage: 'Request error: {type}, {reason}',
        values: {
          reason: rootError.reason,
          type: rootError.type,
        },
      });
    }
  }
}
