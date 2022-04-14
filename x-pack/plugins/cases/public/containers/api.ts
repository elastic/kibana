/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import { StatusAll, ResolvedCase } from '../../common/ui/types';
import {
  CasePatchRequest,
  CasePostRequest,
  CaseResponse,
  CaseResolveResponse,
  CasesFindResponse,
  CasesResponse,
  CasesStatusResponse,
  CaseUserActionsResponse,
  CommentRequest,
  CommentType,
  getCaseCommentsUrl,
  getCaseDetailsUrl,
  getCaseDetailsMetricsUrl,
  getCasePushUrl,
  getCaseUserActionUrl,
  User,
  CaseMetricsResponse,
  getCaseCommentDeleteUrl,
} from '../../common/api';
import {
  CASE_REPORTERS_URL,
  CASE_STATUS_URL,
  CASE_TAGS_URL,
  CASES_URL,
} from '../../common/constants';
import { getAllConnectorTypesUrl } from '../../common/utils/connectors_api';

import { KibanaServices } from '../common/lib/kibana';

import {
  ActionLicense,
  AllCases,
  BulkUpdateStatus,
  Case,
  CaseMetrics,
  CaseMetricsFeature,
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
  decodeCaseResolveResponse,
  decodeCaseMetricsResponse,
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

export const resolveCase = async (
  caseId: string,
  includeComments: boolean = true,
  signal: AbortSignal
): Promise<ResolvedCase> => {
  const response = await KibanaServices.get().http.fetch<CaseResolveResponse>(
    `${getCaseDetailsUrl(caseId)}/resolve`,
    {
      method: 'GET',
      query: {
        includeComments,
      },
      signal,
    }
  );
  return convertToCamelCase<CaseResolveResponse, ResolvedCase>(decodeCaseResolveResponse(response));
};

export const getCasesStatus = async (
  signal: AbortSignal,
  owner: string[]
): Promise<CasesStatus> => {
  const response = await KibanaServices.get().http.fetch<CasesStatusResponse>(CASE_STATUS_URL, {
    method: 'GET',
    signal,
    query: { ...(owner.length > 0 ? { owner } : {}) },
  });
  return convertToCamelCase<CasesStatusResponse, CasesStatus>(decodeCasesStatusResponse(response));
};

export const getTags = async (signal: AbortSignal, owner: string[]): Promise<string[]> => {
  const response = await KibanaServices.get().http.fetch<string[]>(CASE_TAGS_URL, {
    method: 'GET',
    signal,
    query: { ...(owner.length > 0 ? { owner } : {}) },
  });
  return response ?? [];
};

export const getReporters = async (signal: AbortSignal, owner: string[]): Promise<User[]> => {
  const response = await KibanaServices.get().http.fetch<User[]>(CASE_REPORTERS_URL, {
    method: 'GET',
    signal,
    query: { ...(owner.length > 0 ? { owner } : {}) },
  });
  return response ?? [];
};

export const getCaseMetrics = async (
  caseId: string,
  features: CaseMetricsFeature[],
  signal: AbortSignal
): Promise<CaseMetrics> => {
  const response = await KibanaServices.get().http.fetch<CaseMetricsResponse>(
    getCaseDetailsMetricsUrl(caseId),
    {
      method: 'GET',
      signal,
      query: { features: JSON.stringify(features) },
    }
  );
  return convertToCamelCase<CaseMetricsResponse, CaseMetrics>(decodeCaseMetricsResponse(response));
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
    status: StatusAll,
    tags: [],
    owner: [],
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
    status: filterOptions.status,
    ...(filterOptions.search.length > 0 ? { search: filterOptions.search } : {}),
    ...(filterOptions.owner.length > 0 ? { owner: filterOptions.owner } : {}),
    ...queryParams,
  };
  const response = await KibanaServices.get().http.fetch<CasesFindResponse>(`${CASES_URL}/_find`, {
    method: 'GET',
    query: query.status === StatusAll ? omit(query, ['status']) : query,
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

export const patchComment = async ({
  caseId,
  commentId,
  commentUpdate,
  version,
  signal,
  owner,
}: {
  caseId: string;
  commentId: string;
  commentUpdate: string;
  version: string;
  signal: AbortSignal;
  owner: string;
}): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(getCaseCommentsUrl(caseId), {
    method: 'PATCH',
    body: JSON.stringify({
      comment: commentUpdate,
      type: CommentType.user,
      id: commentId,
      version,
      owner,
    }),
    signal,
  });
  return convertToCamelCase<CaseResponse, Case>(decodeCaseResponse(response));
};

export const deleteComment = async ({
  caseId,
  commentId,
  signal,
}: {
  caseId: string;
  commentId: string;
  signal: AbortSignal;
}): Promise<void> => {
  await KibanaServices.get().http.fetch<CaseResponse>(getCaseCommentDeleteUrl(caseId, commentId), {
    method: 'DELETE',
    signal,
  });
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
  const response = await KibanaServices.get().http.fetch<ActionLicense[]>(
    getAllConnectorTypesUrl(),
    {
      method: 'GET',
      signal,
    }
  );

  return convertArrayToCamelCase(response) as ActionLicense[];
};
