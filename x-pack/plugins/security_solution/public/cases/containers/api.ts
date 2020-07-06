/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CaseResponse,
  CasesResponse,
  CasesFindResponse,
  CasePatchRequest,
  CasePostRequest,
  CasesStatusResponse,
  CommentRequest,
  User,
  CaseUserActionsResponse,
  CaseExternalServiceRequest,
  ServiceConnectorCaseParams,
  ServiceConnectorCaseResponse,
  ActionTypeExecutorResult,
} from '../../../../case/common/api';

import {
  CASE_STATUS_URL,
  CASES_URL,
  CASE_TAGS_URL,
  CASE_REPORTERS_URL,
  ACTION_TYPES_URL,
  ACTION_URL,
} from '../../../../case/common/constants';

import {
  getCaseDetailsUrl,
  getCaseUserActionUrl,
  getCaseCommentsUrl,
} from '../../../../case/common/api/helpers';

import { KibanaServices } from '../../common/lib/kibana';

import {
  ActionLicense,
  AllCases,
  BulkUpdateStatus,
  Case,
  CasesStatus,
  FetchCasesProps,
  SortFieldCase,
  CaseUserActions,
} from './types';

import {
  convertToCamelCase,
  convertAllCasesToCamel,
  convertArrayToCamelCase,
  decodeCaseResponse,
  decodeCasesResponse,
  decodeCasesFindResponse,
  decodeCasesStatusResponse,
  decodeCaseUserActionsResponse,
  decodeServiceConnectorCaseResponse,
} from './utils';

import * as i18n from './translations';

export const getCase = async (
  caseId: string,
  includeComments: boolean = true,
  signal: AbortSignal
): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(getCaseDetailsUrl(caseId), {
    method: 'GET',
    query: {
      includeComments,
    },
    signal,
  });
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response));
};

export const getCasesStatus = async (signal: AbortSignal): Promise<CasesStatus> => {
  const response = await KibanaServices.get().http.fetch<CasesStatusResponse>(CASE_STATUS_URL, {
    method: 'GET',
    signal,
  });
  return convertToCamelCase<CasesStatusResponse, CasesStatus>(decodeCasesStatusResponse(response));
};

export const getTags = async (signal: AbortSignal): Promise<string[]> => {
  const response = await KibanaServices.get().http.fetch<string[]>(CASE_TAGS_URL, {
    method: 'GET',
    signal,
  });
  return response ?? [];
};

export const getReporters = async (signal: AbortSignal): Promise<User[]> => {
  const response = await KibanaServices.get().http.fetch<User[]>(CASE_REPORTERS_URL, {
    method: 'GET',
    signal,
  });
  return response ?? [];
};

export const getCaseUserActions = async (
  caseId: string,
  signal: AbortSignal
): Promise<CaseUserActions[]> => {
  const response = await KibanaServices.get().http.fetch<CaseUserActionsResponse>(
    getCaseUserActionUrl(caseId),
    {
      method: 'GET',
      signal,
    }
  );
  return convertArrayToCamelCase(decodeCaseUserActionsResponse(response)) as CaseUserActions[];
};

export const getCases = async ({
  filterOptions = {
    search: '',
    reporters: [],
    status: 'open',
    tags: [],
  },
  queryParams = {
    page: 1,
    perPage: 20,
    sortField: SortFieldCase.createdAt,
    sortOrder: 'desc',
  },
  signal,
}: FetchCasesProps): Promise<AllCases> => {
  const query = {
    reporters: filterOptions.reporters.map((r) => r.username ?? '').filter((r) => r !== ''),
    tags: filterOptions.tags,
    ...(filterOptions.status !== '' ? { status: filterOptions.status } : {}),
    ...(filterOptions.search.length > 0 ? { search: filterOptions.search } : {}),
    ...queryParams,
  };
  const response = await KibanaServices.get().http.fetch<CasesFindResponse>(`${CASES_URL}/_find`, {
    method: 'GET',
    query,
    signal,
  });
  return convertAllCasesToCamel(decodeCasesFindResponse(response));
};

export const postCase = async (newCase: CasePostRequest, signal: AbortSignal): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(CASES_URL, {
    method: 'POST',
    body: JSON.stringify(newCase),
    signal,
  });
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response));
};

export const patchCase = async (
  caseId: string,
  updatedCase: Pick<CasePatchRequest, 'description' | 'status' | 'tags' | 'title'>,
  version: string,
  signal: AbortSignal
): Promise<Case[]> => {
  const response = await KibanaServices.get().http.fetch<CasesResponse>(CASES_URL, {
    method: 'PATCH',
    body: JSON.stringify({ cases: [{ ...updatedCase, id: caseId, version }] }),
    signal,
  });
  return convertToCamelCase<CasesResponse, Case[]>(decodeCasesResponse(response));
};

export const patchCasesStatus = async (
  cases: BulkUpdateStatus[],
  signal: AbortSignal
): Promise<Case[]> => {
  const response = await KibanaServices.get().http.fetch<CasesResponse>(CASES_URL, {
    method: 'PATCH',
    body: JSON.stringify({ cases }),
    signal,
  });
  return convertToCamelCase<CasesResponse, Case[]>(decodeCasesResponse(response));
};

export const postComment = async (
  newComment: CommentRequest,
  caseId: string,
  signal: AbortSignal
): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(
    `${CASES_URL}/${caseId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(newComment),
      signal,
    }
  );
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response));
};

export const patchComment = async (
  caseId: string,
  commentId: string,
  commentUpdate: string,
  version: string,
  signal: AbortSignal
): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(getCaseCommentsUrl(caseId), {
    method: 'PATCH',
    body: JSON.stringify({ comment: commentUpdate, id: commentId, version }),
    signal,
  });
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response));
};

export const deleteCases = async (caseIds: string[], signal: AbortSignal): Promise<string> => {
  const response = await KibanaServices.get().http.fetch<string>(CASES_URL, {
    method: 'DELETE',
    query: { ids: JSON.stringify(caseIds) },
    signal,
  });
  return response;
};

export const pushCase = async (
  caseId: string,
  push: CaseExternalServiceRequest,
  signal: AbortSignal
): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(
    `${getCaseDetailsUrl(caseId)}/_push`,
    {
      method: 'POST',
      body: JSON.stringify(push),
      signal,
    }
  );
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response));
};

export const pushToService = async (
  connectorId: string,
  casePushParams: ServiceConnectorCaseParams,
  signal: AbortSignal
): Promise<ServiceConnectorCaseResponse> => {
  const response = await KibanaServices.get().http.fetch<ActionTypeExecutorResult>(
    `${ACTION_URL}/action/${connectorId}/_execute`,
    {
      method: 'POST',
      body: JSON.stringify({
        params: { subAction: 'pushToService', subActionParams: casePushParams },
      }),
      signal,
    }
  );

  if (response.status === 'error') {
    throw new Error(response.serviceMessage ?? response.message ?? i18n.ERROR_PUSH_TO_SERVICE);
  }

  return decodeServiceConnectorCaseResponse(response.data);
};

export const getActionLicense = async (signal: AbortSignal): Promise<ActionLicense[]> => {
  const response = await KibanaServices.get().http.fetch<ActionLicense[]>(ACTION_TYPES_URL, {
    method: 'GET',
    signal,
  });
  return response;
};
