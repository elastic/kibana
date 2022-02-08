/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEqual, uniqWith } from 'lodash';
import { ExpressionRenderError } from '../../../../../src/plugins/expressions/public';
import { isEsError } from '../../../../../src/plugins/data/public';
import type { IEsError, Reason } from '../../../../../src/plugins/data/public';

type ErrorCause = Required<IEsError>['attributes'];

interface RequestError extends Error {
  body?: { attributes?: { error: { caused_by: ErrorCause } } };
}

interface ReasonDescription {
  type: string;
  reason: string;
  context?: ReasonDescription;
}

interface EsAggError {
  message: string;
  stack: string;
}

const isNetworkError = (e: Error): boolean => {
  return e.message === 'Batch request failed with status 0'; // Note: 0 here means Network error
};

const isRequestError = (e: Error | RequestError): e is RequestError => {
  if ('body' in e) {
    return e.body?.attributes?.error?.caused_by !== undefined;
  }
  return false;
};

// what happens for runtime field used on indexpatterns not accessible to the user?
// they will throw on the kibana side as data will be undefined
const isEsAggError = (e: Error | EsAggError): e is EsAggError => {
  return 'message' in e && 'stack' in e && !isRequestError(e as Error) && !isEsError(e);
};

function getNestedErrorClauseWithContext({
  type,
  reason,
  caused_by: causedBy,
  lang,
  script,
}: Reason): ReasonDescription[] {
  if (!causedBy) {
    // scripted fields error has changed with no particular hint about painless in it,
    // so it tries to lookup in the message for the script word
    if (/script/.test(reason)) {
      return [{ type, reason, context: { type: 'Painless script', reason: '' } }];
    }
    return [{ type, reason }];
  }
  const [payload] = getNestedErrorClause(causedBy);
  if (lang === 'painless') {
    return [
      {
        ...payload,
        context: { type: 'Painless script', reason: `"${script}"` || reason },
      },
    ];
  }
  return [{ ...payload, context: { type, reason } }];
}

function getNestedErrorClause(e: ErrorCause | Reason): ReasonDescription[] {
  const { type, reason, caused_by: causedBy } = e;
  // Painless scripts errors are nested within the failed_shards property
  if ('failed_shards' in e) {
    if (e.failed_shards) {
      return e.failed_shards.flatMap((shardCause) =>
        getNestedErrorClauseWithContext(shardCause.reason)
      );
    }
  }
  if (causedBy) {
    return getNestedErrorClause(causedBy);
  }
  return [{ type, reason }];
}

function getErrorSources(e: Error) {
  if (isRequestError(e)) {
    return getNestedErrorClause(e.body!.attributes!.error as ErrorCause);
  }
  if (isEsError(e)) {
    if (e.attributes?.reason) {
      return getNestedErrorClause(e.attributes);
    }
    return getNestedErrorClause(e.attributes?.caused_by as ErrorCause);
  }
  return [];
}

export function getOriginalRequestErrorMessages(error?: ExpressionRenderError | null): string[] {
  const errorMessages = [];
  if (error && 'original' in error && error.original) {
    if (isEsAggError(error.original)) {
      if (isNetworkError(error.original)) {
        errorMessages.push(
          i18n.translate('xpack.lens.editorFrame.networkErrorMessage', {
            defaultMessage: 'Network error, try again later or contact your administrator.',
          })
        );
      } else {
        errorMessages.push(error.message);
      }
    } else {
      const rootErrors = uniqWith(getErrorSources(error.original), isEqual);
      for (const rootError of rootErrors) {
        if (rootError.context) {
          errorMessages.push(
            i18n.translate('xpack.lens.editorFrame.expressionFailureMessageWithContext', {
              defaultMessage: 'Request error: {type}, {reason} in {context}',
              values: {
                reason: rootError.reason,
                type: rootError.type,
                context: rootError.context.reason
                  ? `${rootError.context.reason} (${rootError.context.type})`
                  : rootError.context.type,
              },
            })
          );
        } else {
          errorMessages.push(
            i18n.translate('xpack.lens.editorFrame.expressionFailureMessage', {
              defaultMessage: 'Request error: {type}, {reason}',
              values: {
                reason: rootError.reason,
                type: rootError.type,
              },
            })
          );
        }
      }
    }
  }
  return errorMessages;
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
  return i18n.translate('xpack.lens.editorFrame.expressionMissingDataView', {
    defaultMessage: 'Could not find the {count, plural, one {data view} other {data views}}: {ids}',
    values: { count: indexPatternIds.length, ids: indexPatternIds.join(', ') },
  });
}

export function getUnknownVisualizationTypeError(visType: string) {
  return {
    shortMessage: i18n.translate('xpack.lens.unknownVisType.shortMessage', {
      defaultMessage: `Unknown visualization type`,
    }),
    longMessage: i18n.translate('xpack.lens.unknownVisType.longMessage', {
      defaultMessage: `The visualization type {visType} could not be resolved.`,
      values: {
        visType,
      },
    }),
  };
}
