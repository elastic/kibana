/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign } from 'lodash';

import {
  CasePatchRequest,
  CasePostRequest,
  CaseResponse,
  CasesFindResponse,
  CasesResponse,
  CasesStatusResponse,
  CaseStatuses,
  CaseUserActionsResponse,
  CommentRequest,
  CommentType,
  SubCasePatchRequest,
  SubCaseResponse,
  SubCasesResponse,
  User,
} from '../../../../case/common/api';

import {
  ACTION_TYPES_URL,
  CASE_REPORTERS_URL,
  CASE_STATUS_URL,
  CASE_TAGS_URL,
  CASES_URL,
  SUB_CASE_DETAILS_URL,
  SUB_CASES_PATCH_DEL_URL,
} from '../../../../case/common/constants';

import {
  getCaseCommentsUrl,
  getCasePushUrl,
  getCaseDetailsUrl,
  getCaseUserActionUrl,
  getSubCaseDetailsUrl,
  getSubCaseUserActionUrl,
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
} from './utils';

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

export const getSubCase = async (
  caseId: string,
  subCaseId: string,
  includeComments: boolean = true,
  signal: AbortSignal
): Promise<Case> => {
  const [caseResponse, subCaseResponse] = await Promise.all([
    KibanaServices.get().http.fetch<CaseResponse>(getCaseDetailsUrl(caseId), {
      method: 'GET',
      query: {
        includeComments: false,
      },
      signal,
    }),
    KibanaServices.get().http.fetch<SubCaseResponse>(getSubCaseDetailsUrl(caseId, subCaseId), {
      method: 'GET',
      query: {
        includeComments,
      },
      signal,
    }),
  ]);
  const response = assign<CaseResponse, SubCaseResponse>(caseResponse, subCaseResponse);
  const subCaseIndex = response.subCaseIds?.findIndex((scId) => scId === response.id) ?? -1;
  response.title = `${response.title}${subCaseIndex >= 0 ? ` ${subCaseIndex + 1}` : ''}`;
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

export const getSubCaseUserActions = async (
  caseId: string,
  subCaseId: string,
  signal: AbortSignal
): Promise<CaseUserActions[]> => {
  const response = await KibanaServices.get().http.fetch<CaseUserActionsResponse>(
    getSubCaseUserActionUrl(caseId, subCaseId),
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
    status: CaseStatuses.open,
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
    tags: filterOptions.tags.map((t) => `"${t.replace(/"/g, '\\"')}"`),
    status: filterOptions.status,
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
  updatedCase: Pick<
    CasePatchRequest,
    'description' | 'status' | 'tags' | 'title' | 'settings' | 'connector'
  >,
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

export const patchSubCase = async (
  caseId: string,
  subCaseId: string,
  updatedSubCase: Pick<SubCasePatchRequest, 'status'>,
  version: string,
  signal: AbortSignal
): Promise<Case[]> => {
  const subCaseResponse = await KibanaServices.get().http.fetch<SubCasesResponse>(
    SUB_CASE_DETAILS_URL,
    {
      method: 'PATCH',
      body: JSON.stringify({ cases: [{ ...updatedSubCase, id: caseId, version }] }),
      signal,
    }
  );
  const caseResponse = await KibanaServices.get().http.fetch<CaseResponse>(
    getCaseDetailsUrl(caseId),
    {
      method: 'GET',
      query: {
        includeComments: false,
      },
      signal,
    }
  );
  const response = subCaseResponse.map((subCaseResp) => assign(caseResponse, subCaseResp));
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
  signal: AbortSignal,
  subCaseId?: string
): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(
    `${CASES_URL}/${caseId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(newComment),
      ...(subCaseId ? { query: { subCaseId } } : {}),
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
  signal: AbortSignal,
  subCaseId?: string
): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(getCaseCommentsUrl(caseId), {
    method: 'PATCH',
    body: JSON.stringify({
      comment: commentUpdate,
      type: CommentType.user,
      id: commentId,
      version,
    }),
    ...(subCaseId ? { query: { subCaseId } } : {}),
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

export const deleteSubCases = async (caseIds: string[], signal: AbortSignal): Promise<string> => {
  const response = await KibanaServices.get().http.fetch<string>(SUB_CASES_PATCH_DEL_URL, {
    method: 'DELETE',
    query: { ids: JSON.stringify(caseIds) },
    signal,
  });
  return response;
};

export const pushCase = async (
  caseId: string,
  connectorId: string,
  signal: AbortSignal
): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(
    getCasePushUrl(caseId, connectorId),
    {
      method: 'POST',
      body: JSON.stringify({}),
      signal,
    }
  );

  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response));
};

export const getActionLicense = async (signal: AbortSignal): Promise<ActionLicense[]> => {
  const response = await KibanaServices.get().http.fetch<ActionLicense[]>(ACTION_TYPES_URL, {
    method: 'GET',
    signal,
  });
  return response;
};
