/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject, transform, snakeCase, isEmpty } from 'lodash';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import type { z } from 'zod';

import type { ToastInputFields } from '@kbn/core/public';
import { NO_ASSIGNEES_FILTERING_KEYWORD } from '../../common/constants';
import type {
  CaseResponse,
  CasesResponse,
  CasesConfigurationsResponse,
  CasesConfigureResponse,
  CaseUserActionsResponse,
  CasePatchRequest,
  CaseResolveResponse,
  SingleCaseMetricsResponse,
  User,
} from '../../common/api';
import {
  CaseConfigureResponseSchema,
  CaseResponseRt,
  CaseResolveResponseRt,
  throwErrors,
  SingleCaseMetricsResponseRt,
  CasesResponseRt,
  CaseConfigurationsResponseSchema,
  CaseUserActionsResponseRt,
} from '../../common/api';
import type { Case, FilterOptions, UpdateByKey } from './types';
import * as i18n from './translations';

export const getTypedPayload = <T>(a: unknown): T => a as T;

export const covertToSnakeCase = (obj: Record<string, unknown>) =>
  transform(obj, (acc: Record<string, unknown>, value, key, target) => {
    const camelKey = Array.isArray(target) ? key : snakeCase(key);
    acc[camelKey] = isObject(value) ? covertToSnakeCase(value as Record<string, unknown>) : value;
  });

// TODO: refactor duplicateish code in runtime_types.ts
export const decodeSchema = <T>(schema: z.Schema<T>, data: unknown): T => {
  try {
    const parseRes = schema.safeParse(data);

    if (!parseRes.success) {
      const errors = parseRes.error.issues
        .map((issue) => `Field: ${issue.path.join('.')} error: ${issue.message}`)
        .join('\n');

      throw createToasterPlainError(errors);
    } else {
      return parseRes.data;
    }
  } catch (error) {
    throw createToasterPlainError(error.message);
  }
};

export const createToasterPlainError = (message: string) => new ToasterError([message]);

export const decodeCaseResponse = (respCase?: CaseResponse) =>
  pipe(CaseResponseRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCaseResolveResponse = (respCase?: CaseResolveResponse) =>
  pipe(
    CaseResolveResponseRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeSingleCaseMetricsResponse = (respCase?: SingleCaseMetricsResponse) =>
  pipe(
    SingleCaseMetricsResponseRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeCasesResponse = (respCase?: CasesResponse) =>
  pipe(CasesResponseRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCaseConfigurationsResponse = (respCase?: CasesConfigurationsResponse) => {
  return decodeSchema(CaseConfigurationsResponseSchema, respCase);
};

export const decodeCaseConfigureResponse = (respCase?: CasesConfigureResponse) =>
  decodeSchema(CaseConfigureResponseSchema, respCase);

export const decodeCaseUserActionsResponse = (respUserActions?: CaseUserActionsResponse) =>
  pipe(
    CaseUserActionsResponseRt.decode(respUserActions),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const valueToUpdateIsSettings = (
  key: UpdateByKey['updateKey'],
  value: UpdateByKey['updateValue']
): value is CasePatchRequest['settings'] => key === 'settings';

export const valueToUpdateIsStatus = (
  key: UpdateByKey['updateKey'],
  value: UpdateByKey['updateValue']
): value is CasePatchRequest['status'] => key === 'status';

export class ToasterError extends Error {
  public readonly messages: string[];

  constructor(messages: string[]) {
    super(messages[0]);
    this.name = 'ToasterError';
    this.messages = messages;
  }
}
export const createUpdateSuccessToaster = (
  caseBeforeUpdate: Case,
  caseAfterUpdate: Case,
  key: UpdateByKey['updateKey'],
  value: UpdateByKey['updateValue']
): ToastInputFields => {
  const caseHasAlerts = caseBeforeUpdate.comments.some(
    (comment) => comment.type === CommentType.alert
  );

  const toast: ToastInputFields = {
    title: i18n.UPDATED_CASE(caseAfterUpdate.title),
  };

  if (valueToUpdateIsSettings(key, value) && value?.syncAlerts && caseHasAlerts) {
    return {
      ...toast,
      title: i18n.SYNC_CASE(caseAfterUpdate.title),
    };
  }

  if (valueToUpdateIsStatus(key, value) && caseHasAlerts && caseBeforeUpdate.settings.syncAlerts) {
    return {
      ...toast,
      text: i18n.STATUS_CHANGED_TOASTER_TEXT,
    };
  }

  return toast;
};

export const constructAssigneesFilter = (
  assignees: FilterOptions['assignees']
): { assignees?: string | string[] } =>
  assignees === null || assignees.length > 0
    ? {
        assignees:
          assignees?.map((assignee) =>
            assignee === null ? NO_ASSIGNEES_FILTERING_KEYWORD : assignee
          ) ?? NO_ASSIGNEES_FILTERING_KEYWORD,
      }
    : {};

export const constructReportersFilter = (reporters: User[]) => {
  return reporters.length > 0
    ? {
        reporters: reporters
          .map((reporter) => {
            if (reporter.profile_uid != null) {
              return reporter.profile_uid;
            }

            return reporter.username ?? '';
          })
          .filter((reporterID) => !isEmpty(reporterID)),
      }
    : {};
};
