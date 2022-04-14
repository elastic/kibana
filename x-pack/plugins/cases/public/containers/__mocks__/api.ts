/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionLicense,
  AllCases,
  BulkUpdateStatus,
  Case,
  CasesStatus,
  CaseUserActions,
  FetchCasesProps,
  SortFieldCase,
} from '../types';
import {
  actionLicenses,
  allCases,
  basicCase,
  basicCaseMetrics,
  basicCaseCommentPatch,
  basicCasePost,
  basicResolvedCase,
  casesStatus,
  caseUserActions,
  pushedCase,
  respReporters,
  tags,
} from '../mock';
import { ResolvedCase } from '../../../common/ui/types';
import {
  CasePatchRequest,
  CasePostRequest,
  CommentRequest,
  User,
  CaseStatuses,
  CaseMetricsResponse,
} from '../../../common/api';

export const getCase = async (
  caseId: string,
  includeComments: boolean = true,
  signal: AbortSignal
): Promise<Case> => Promise.resolve(basicCase);

export const resolveCase = async (
  caseId: string,
  includeComments: boolean = true,
  signal: AbortSignal
): Promise<ResolvedCase> => Promise.resolve(basicResolvedCase);

export const getCaseMetrics = async (
  caseId: string,
  signal: AbortSignal
): Promise<CaseMetricsResponse> => Promise.resolve(basicCaseMetrics);

export const getCasesStatus = async (signal: AbortSignal): Promise<CasesStatus> =>
  Promise.resolve(casesStatus);

export const getTags = async (signal: AbortSignal): Promise<string[]> => Promise.resolve(tags);

export const getReporters = async (signal: AbortSignal): Promise<User[]> =>
  Promise.resolve(respReporters);

export const getCaseUserActions = async (
  caseId: string,
  signal: AbortSignal
): Promise<CaseUserActions[]> => Promise.resolve(caseUserActions);

export const getCases = async ({
  filterOptions = {
    search: '',
    reporters: [],
    status: CaseStatuses.open,
    tags: [],
    owner: [],
  },
  queryParams = {
    page: 1,
    perPage: 5,
    sortField: SortFieldCase.createdAt,
    sortOrder: 'desc',
  },
  signal,
}: FetchCasesProps): Promise<AllCases> => Promise.resolve(allCases);

export const postCase = async (newCase: CasePostRequest, signal: AbortSignal): Promise<Case> =>
  Promise.resolve(basicCasePost);

export const patchCase = async (
  caseId: string,
  updatedCase: Pick<CasePatchRequest, 'description' | 'status' | 'tags' | 'title'>,
  version: string,
  signal: AbortSignal
): Promise<Case[]> => Promise.resolve([basicCase]);

export const patchCasesStatus = async (
  cases: BulkUpdateStatus[],
  signal: AbortSignal
): Promise<Case[]> => Promise.resolve(allCases.cases);

export const postComment = async (
  newComment: CommentRequest,
  caseId: string,
  signal: AbortSignal
): Promise<Case> => Promise.resolve(basicCase);

export const deleteComment = async (
  caseId: string,
  commentId: string,
  signal: AbortSignal
): Promise<void> => Promise.resolve(undefined);

export const patchComment = async (
  caseId: string,
  commentId: string,
  commentUpdate: string,
  version: string,
  signal: AbortSignal
): Promise<Case> => Promise.resolve(basicCaseCommentPatch);

export const deleteCases = async (caseIds: string[], signal: AbortSignal): Promise<boolean> =>
  Promise.resolve(true);

export const pushCase = async (
  caseId: string,
  connectorId: string,
  signal: AbortSignal
): Promise<Case> => Promise.resolve(pushedCase);

export const getActionLicense = async (signal: AbortSignal): Promise<ActionLicense[]> =>
  Promise.resolve(actionLicenses);
