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

import type { ToastInputFields } from '@kbn/core/public';
import { NO_ASSIGNEES_FILTERING_KEYWORD } from '../../common/constants';
import type {
  Configurations,
  Configuration,
  UserActions,
  CasePatchRequest,
  CaseResolveResponse,
  SingleCaseMetricsResponse,
  User,
  CaseUserActionStatsResponse,
  Case,
  Cases,
} from '../../common/api';
import {
  CaseRt,
  CasesRt,
  throwErrors,
  ConfigurationsRt,
  ConfigurationRt,
  UserActionsRt,
  CommentType,
  CaseResolveResponseRt,
  SingleCaseMetricsResponseRt,
  CaseUserActionStatsResponseRt,
} from '../../common/api';
import type { CaseUI, FilterOptions, UpdateByKey } from './types';
import * as i18n from './translations';

export const getTypedPayload = <T>(a: unknown): T => a as T;

export const covertToSnakeCase = (obj: Record<string, unknown>) =>
  transform(obj, (acc: Record<string, unknown>, value, key, target) => {
    const camelKey = Array.isArray(target) ? key : snakeCase(key);
    acc[camelKey] = isObject(value) ? covertToSnakeCase(value as Record<string, unknown>) : value;
  });

export const createToasterPlainError = (message: string) => new ToasterError([message]);

export const decodeCaseResponse = (respCase?: Case) =>
  pipe(CaseRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

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

export const decodeCasesResponse = (respCase?: Cases) =>
  pipe(CasesRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCaseConfigurationsResponse = (respCase?: Configurations) => {
  return pipe(
    ConfigurationsRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );
};

export const decodeCaseConfigureResponse = (respCase?: Configuration) =>
  pipe(ConfigurationRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCaseUserActionsResponse = (respUserActions?: UserActions) =>
  pipe(UserActionsRt.decode(respUserActions), fold(throwErrors(createToasterPlainError), identity));

export const decodeCaseUserActionStatsResponse = (
  caseUserActionsStats: CaseUserActionStatsResponse
) =>
  pipe(
    CaseUserActionStatsResponseRt.decode(caseUserActionsStats),
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
  caseBeforeUpdate: CaseUI,
  caseAfterUpdate: CaseUI,
  key: UpdateByKey['updateKey'],
  value: UpdateByKey['updateValue']
): ToastInputFields => {
  const caseHasAlerts = caseBeforeUpdate.comments.some(
    (comment) => comment.type === CommentType.alert
  );

  const toast: ToastInputFields = {
    title: i18n.UPDATED_CASE(caseAfterUpdate.title),
    className: 'eui-textBreakWord',
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
