/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEqual, uniqWith } from 'lodash';
import { ExpressionRenderError } from '@kbn/expressions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { isEsError } from '@kbn/data-plugin/public';
import type { IEsError, Reason } from '@kbn/data-plugin/public';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { RemovableUserMessage } from '../types';

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

const isTSDBError = (e: ReasonDescription): boolean => {
  return (
    e.type === 'illegal_argument_exception' &&
    /\]\[counter\] is not supported for aggregation/.test(e.reason)
  );
};

// what happens for runtime field used on indexpatterns not accessible to the user?
// they will throw on the kibana side as data will be undefined
const isEsAggError = (e: Error | EsAggError): e is EsAggError => {
  return 'message' in e && 'stack' in e && !isRequestError(e as Error) && !isEsError(e);
};

function getNestedErrorClauseWithContext({
  type,
  reason = '',
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
  const { type, reason = '', caused_by: causedBy } = e;
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

export function getOriginalRequestErrorMessages(
  error: ExpressionRenderError | null,
  docLinks: CoreStart['docLinks']
): RemovableUserMessage[] {
  const errorMessages: Array<string | { short: string; long: React.ReactNode }> = [];
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
        } else if (isTSDBError(rootError)) {
          const [fieldName, _type, _isCounter, opUsed] = rootError.reason.match(/\[(\w)*\]/g)!;
          const shortMessage = i18n.translate(
            'xpack.lens.editorFrame.expressionTSDBDetailedMessage',
            {
              defaultMessage:
                'The field {field} of Time series type [counter] has been used with the unsupported operation {op}.',
              values: {
                field: fieldName,
                op: opUsed,
              },
            }
          );
          const message = (
            <>
              <p className="eui-textBreakWord">{shortMessage}</p>
              <EuiLink href={docLinks.links.fleet.datastreamsTSDSMetrics} external target="_blank">
                {i18n.translate('xpack.lens.editorFrame.expressionTSDBCounterInfo', {
                  defaultMessage:
                    'See more about Time series field types and [counter] supported aggregations',
                })}
              </EuiLink>
            </>
          );
          errorMessages.push({
            short: shortMessage,
            long: message,
          });
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
  } else if (error?.message) {
    errorMessages.push(error.message);
  }
  return errorMessages.map((message) => ({
    uniqueId: typeof message === 'string' ? message : message.short,
    severity: 'error',
    displayLocations: [{ id: 'visualizationOnEmbeddable' }],
    longMessage: typeof message === 'string' ? '' : message.long,
    shortMessage: typeof message === 'string' ? message : message.short,
    fixableInEditor: false,
  }));
}

// NOTE - if you are adding a new error message, add it as a UserMessage in get_application_error_messages
// or the getUserMessages method of a particular datasource or visualization class! Alternatively, use the
// addUserMessage function passed down by the application component.
