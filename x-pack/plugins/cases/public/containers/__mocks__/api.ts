/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionLicense,
  Cases,
  Case,
  CasesStatus,
  FetchCasesProps,
  FindCaseUserActions,
} from '../types';
import { SortFieldCase } from '../types';
import {
  actionLicenses,
  allCases,
  basicCase,
  basicCaseMetrics,
  basicCaseCommentPatch,
  basicCasePost,
  basicResolvedCase,
  casesStatus,
  pushedCase,
  tags,
  findCaseUserActionsResponse,
} from '../mock';
import type { CaseConnectors, CaseUpdateRequest, ResolvedCase } from '../../../common/ui/types';
import { SeverityAll } from '../../../common/ui/types';
import type {
  CasePatchRequest,
  CasePostRequest,
  CommentRequest,
  SingleCaseMetricsResponse,
} from '../../../common/api';
import { CaseStatuses } from '../../../common/api';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { UserProfile } from '@kbn/security-plugin/common';
import { userProfiles } from '../user_profiles/api.mock';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';

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

export const getSingleCaseMetrics = async (
  caseId: string,
  signal: AbortSignal
): Promise<SingleCaseMetricsResponse> => Promise.resolve(basicCaseMetrics);

export const getCasesStatus = async (signal: AbortSignal): Promise<CasesStatus> =>
  Promise.resolve(casesStatus);

export const getTags = async (signal: AbortSignal): Promise<string[]> => Promise.resolve(tags);

export const findAssignees = async (): Promise<UserProfile[]> => userProfiles;

export const findCaseUserActions = async (
  caseId: string,
  signal: AbortSignal
): Promise<FindCaseUserActions> => Promise.resolve(findCaseUserActionsResponse);

export const getCases = async ({
  filterOptions = {
    severity: SeverityAll,
    search: '',
    searchFields: [],
    assignees: [],
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
}: FetchCasesProps): Promise<Cases> => Promise.resolve(allCases);

export const postCase = async (newCase: CasePostRequest, signal: AbortSignal): Promise<Case> =>
  Promise.resolve(basicCasePost);

export const patchCase = async (
  caseId: string,
  updatedCase: Pick<CasePatchRequest, 'description' | 'status' | 'tags' | 'title'>,
  version: string,
  signal: AbortSignal
): Promise<Case[]> => Promise.resolve([basicCase]);

export const updateCases = async (
  cases: CaseUpdateRequest[],
  signal: AbortSignal
): Promise<Case[]> => Promise.resolve(allCases.cases);

export const createAttachments = async (
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

export const getFeatureIds = async (
  _query: { registrationContext: string[] },
  _signal: AbortSignal
): Promise<ValidFeatureId[]> => Promise.resolve(['siem', 'observability']);

export const getCaseConnectors = async (
  caseId: string,
  signal: AbortSignal
): Promise<CaseConnectors> => Promise.resolve(getCaseConnectorsMockResponse());
