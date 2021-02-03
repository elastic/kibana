/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { set } from '@elastic/safer-lodash-set';
import { camelCase, isArray, isObject } from 'lodash';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import {
  CasesFindResponse,
  CasesFindResponseRt,
  CaseResponse,
  CaseResponseRt,
  CasesResponse,
  CasesResponseRt,
  CasesStatusResponseRt,
  CasesStatusResponse,
  throwErrors,
  CasesConfigureResponse,
  CaseConfigureResponseRt,
  CaseUserActionsResponse,
  CaseUserActionsResponseRt,
  ServiceConnectorCaseResponseRt,
  ServiceConnectorCaseResponse,
  CommentType,
  CasePatchRequest,
} from '../../../../case/common/api';
import { AppToast, ToasterError } from '../../common/components/toasters';
import { AllCases, Case, UpdateByKey } from './types';
import * as i18n from './translations';

export const getTypedPayload = <T>(a: unknown): T => a as T;

export const parseString = (params: string) => {
  try {
    return JSON.parse(params);
  } catch {
    return null;
  }
};

export const convertArrayToCamelCase = (arrayOfSnakes: unknown[]): unknown[] =>
  arrayOfSnakes.reduce((acc: unknown[], value) => {
    if (isArray(value)) {
      return [...acc, convertArrayToCamelCase(value)];
    } else if (isObject(value)) {
      return [...acc, convertToCamelCase(value)];
    } else {
      return [...acc, value];
    }
  }, []);

export const convertToCamelCase = <T, U extends {}>(snakeCase: T): U =>
  Object.entries(snakeCase).reduce((acc, [key, value]) => {
    if (isArray(value)) {
      set(acc, camelCase(key), convertArrayToCamelCase(value));
    } else if (isObject(value)) {
      set(acc, camelCase(key), convertToCamelCase(value));
    } else {
      set(acc, camelCase(key), value);
    }
    return acc;
  }, {} as U);

export const convertAllCasesToCamel = (snakeCases: CasesFindResponse): AllCases => ({
  cases: snakeCases.cases.map((snakeCase) => convertToCamelCase<CaseResponse, Case>(snakeCase)),
  countOpenCases: snakeCases.count_open_cases,
  countInProgressCases: snakeCases.count_in_progress_cases,
  countClosedCases: snakeCases.count_closed_cases,
  page: snakeCases.page,
  perPage: snakeCases.per_page,
  total: snakeCases.total,
});

export const decodeCasesStatusResponse = (respCase?: CasesStatusResponse) =>
  pipe(
    CasesStatusResponseRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const createToasterPlainError = (message: string) => new ToasterError([message]);

export const decodeCaseResponse = (respCase?: CaseResponse) =>
  pipe(CaseResponseRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCasesResponse = (respCase?: CasesResponse) =>
  pipe(CasesResponseRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCasesFindResponse = (respCases?: CasesFindResponse) =>
  pipe(CasesFindResponseRt.decode(respCases), fold(throwErrors(createToasterPlainError), identity));

export const decodeCaseConfigureResponse = (respCase?: CasesConfigureResponse) =>
  pipe(
    CaseConfigureResponseRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeCaseUserActionsResponse = (respUserActions?: CaseUserActionsResponse) =>
  pipe(
    CaseUserActionsResponseRt.decode(respUserActions),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeServiceConnectorCaseResponse = (respPushCase?: ServiceConnectorCaseResponse) =>
  pipe(
    ServiceConnectorCaseResponseRt.decode(respPushCase),
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

export const createUpdateSuccessToaster = (
  caseBeforeUpdate: Case,
  caseAfterUpdate: Case,
  key: UpdateByKey['updateKey'],
  value: UpdateByKey['updateValue']
): AppToast => {
  const caseHasAlerts = caseBeforeUpdate.comments.some(
    (comment) => comment.type === CommentType.alert
  );

  const toast: AppToast = {
    id: uuid.v4(),
    color: 'success',
    iconType: 'check',
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
