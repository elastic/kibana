/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import type {
  Cases,
  CaseUpdateRequest,
  FetchCasesProps,
  ResolvedCase,
  FindCaseUserActions,
} from '../../common/ui/types';
import { SeverityAll, SortFieldCase, StatusAll } from '../../common/ui/types';
import type {
  BulkCreateCommentRequest,
  CasePatchRequest,
  CasePostRequest,
  CaseResponse,
  CaseResolveResponse,
  CasesResponse,
  UserActionFindResponse,
  CommentRequest,
  User,
  SingleCaseMetricsResponse,
  CasesFindResponse,
} from '../../common/api';
import {
  CommentType,
  getCaseCommentsUrl,
  getCaseDetailsUrl,
  getCaseDetailsMetricsUrl,
  getCasePushUrl,
  getCaseFindUserActionsUrl,
  getCaseCommentDeleteUrl,
} from '../../common/api';
import {
  CASE_REPORTERS_URL,
  CASE_TAGS_URL,
  CASES_URL,
  INTERNAL_BULK_CREATE_ATTACHMENTS_URL,
  MAX_DOCS_PER_PAGE,
} from '../../common/constants';
import { getAllConnectorTypesUrl } from '../../common/utils/connectors_api';

import { KibanaServices } from '../common/lib/kibana';

import {
  convertAllCasesToCamel,
  convertToCamelCase,
  convertArrayToCamelCase,
  convertUserActionsToCamelCase,
  convertCaseToCamelCase,
  convertCasesToCamelCase,
  convertCaseResolveToCamelCase,
} from '../api/utils';

import type {
  ActionLicense,
  Case,
  SingleCaseMetrics,
  SingleCaseMetricsFeature,
  CaseUserActions,
} from './types';

import {
  decodeCaseResponse,
  decodeCasesResponse,
  decodeCaseUserActionsResponse,
  decodeCaseResolveResponse,
  decodeSingleCaseMetricsResponse,
  constructAssigneesFilter,
  constructReportersFilter,
} from './utils';
import { decodeCasesFindResponse } from '../api/decoders';

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
  return convertCaseToCamelCase(decodeCaseResponse(response));
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
  return convertCaseResolveToCamelCase(decodeCaseResolveResponse(response));
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

export const getSingleCaseMetrics = async (
  caseId: string,
  features: SingleCaseMetricsFeature[],
  signal: AbortSignal
): Promise<SingleCaseMetrics> => {
  const response = await KibanaServices.get().http.fetch<SingleCaseMetricsResponse>(
    getCaseDetailsMetricsUrl(caseId),
    {
      method: 'GET',
      signal,
      query: { features: JSON.stringify(features) },
    }
  );
  return convertToCamelCase<SingleCaseMetricsResponse, SingleCaseMetrics>(
    decodeSingleCaseMetricsResponse(response)
  );
};

export const findCaseUserActions = async (
  caseId: string,
  signal: AbortSignal
): Promise<FindCaseUserActions> => {
  const response = await KibanaServices.get().http.fetch<UserActionFindResponse>(
    getCaseFindUserActionsUrl(caseId),
    {
      method: 'GET',
      signal,
      query: {
        perPage: MAX_DOCS_PER_PAGE,
      },
    }
  );

  return {
    ...response,
    userActions: convertUserActionsToCamelCase(
      decodeCaseUserActionsResponse(response.userActions)
    ) as CaseUserActions[],
  };
};

export const getCases = async ({
  filterOptions = {
    search: '',
    searchFields: [],
    severity: SeverityAll,
    assignees: [],
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
}: FetchCasesProps): Promise<Cases> => {
  const query = {
    ...(filterOptions.status !== StatusAll ? { status: filterOptions.status } : {}),
    ...(filterOptions.severity !== SeverityAll ? { severity: filterOptions.severity } : {}),
    ...constructAssigneesFilter(filterOptions.assignees),
    ...constructReportersFilter(filterOptions.reporters),
    ...(filterOptions.tags.length > 0 ? { tags: filterOptions.tags } : {}),
    ...(filterOptions.search.length > 0 ? { search: filterOptions.search } : {}),
    ...(filterOptions.searchFields.length > 0 ? { searchFields: filterOptions.searchFields } : {}),
    ...(filterOptions.owner.length > 0 ? { owner: filterOptions.owner } : {}),
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
  return convertCaseToCamelCase(decodeCaseResponse(response));
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
  return convertCasesToCamelCase(decodeCasesResponse(response));
};

export const updateCases = async (
  cases: CaseUpdateRequest[],
  signal: AbortSignal
): Promise<Case[]> => {
  if (cases.length === 0) {
    return [];
  }

  const response = await KibanaServices.get().http.fetch<CasesResponse>(CASES_URL, {
    method: 'PATCH',
    body: JSON.stringify({ cases }),
    signal,
  });

  return convertCasesToCamelCase(decodeCasesResponse(response));
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
  return convertCaseToCamelCase(decodeCaseResponse(response));
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
  return convertCaseToCamelCase(decodeCaseResponse(response));
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

  return convertCaseToCamelCase(decodeCaseResponse(response));
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

export const createAttachments = async (
  attachments: BulkCreateCommentRequest,
  caseId: string,
  signal: AbortSignal
): Promise<Case> => {
  const response = await KibanaServices.get().http.fetch<CaseResponse>(
    INTERNAL_BULK_CREATE_ATTACHMENTS_URL.replace('{case_id}', caseId),
    {
      method: 'POST',
      body: JSON.stringify(attachments),
      signal,
    }
  );
  return convertCaseToCamelCase(decodeCaseResponse(response));
};

export const getFeatureIds = async (
  query: { registrationContext: string[] },
  signal: AbortSignal
): Promise<ValidFeatureId[]> => {
  return KibanaServices.get().http.fetch<ValidFeatureId[]>(
    `${BASE_RAC_ALERTS_API_PATH}/_feature_ids`,
    {
      signal,
      query,
    }
  );
};
