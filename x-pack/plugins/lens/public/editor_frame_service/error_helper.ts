/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ExpressionRenderError } from 'src/plugins/expressions/public';

interface ElasticsearchErrorClause {
  type: string;
  reason: string;
  caused_by?: ElasticsearchErrorClause;
  failed_shards?: Array<{ reason: ElasticsearchErrorClause & { script?: string; lang?: string } }>;
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

const isScriptedFieldError = (e: ElasticsearchErrorClause) => {
  if ('failed_shards' in e) {
    return e.failed_shards?.some(({ reason }) => reason?.type === 'script_exception');
  }
  return false;
};

interface ESError extends Error {
  attributes?: ElasticsearchErrorClause;
}

const isEsError = (e: Error | ESError): e is ESError => {
  if ('attributes' in e) {
    return e.attributes?.caused_by !== undefined;
  }
  return false;
};

function getNestedErrorClause(e: ElasticsearchErrorClause): { type: string; reason: string } {
  if (isScriptedFieldError(e)) {
    const nestedError = e.failed_shards![0].reason;
    return { type: nestedError.type, reason: `${nestedError.reason}: ${nestedError.script}` };
  }
  const { type, reason, caused_by: causedBy } = e;
  if (causedBy) {
    return getNestedErrorClause(causedBy);
  }
  return { type, reason };
}

function getErrorSource(e: Error | RequestError | ESError) {
  if (isRequestError(e)) {
    return e.body!.attributes!.error;
  }
  if (isEsError(e)) {
    if (e.attributes?.reason) {
      return e.attributes;
    }
    return e.attributes?.caused_by;
  }
}

export function getOriginalRequestErrorMessage(error?: ExpressionRenderError | null) {
  if (error && 'original' in error && error.original) {
    const errorSource = getErrorSource(error.original);
    if (errorSource == null) {
      return;
    }
    const rootError = getNestedErrorClause(errorSource);
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

export function getMissingVisualizationTypeError() {
  return i18n.translate('xpack.lens.editorFrame.expressionMissingVisualizationType', {
    defaultMessage: 'Visualization type not found.',
  });
}

export function getMissingCurrentDatasource() {
  return i18n.translate('xpack.lens.editorFrame.expressionMissingDatasource', {
    defaultMessage: 'Could not find datasource for the visualization',
  });
}

export function getMissingIndexPatterns(indexPatternIds: string[]) {
  return i18n.translate('xpack.lens.editorFrame.expressionMissingIndexPattern', {
    defaultMessage:
      'Could not find the {count, plural, one {index pattern} other {index pattern}}: {ids}',
    values: { count: indexPatternIds.length, ids: indexPatternIds.join(', ') },
  });
}
