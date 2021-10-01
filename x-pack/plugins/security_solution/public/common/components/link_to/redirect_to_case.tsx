/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendSearch } from './helpers';

export const getCaseUrl = (search?: string | null) => `${appendSearch(search ?? undefined)}`;

export const getCaseDetailsUrl = ({
  id,
  search,
  subCaseId,
}: {
  id: string;
  search?: string | null;
  subCaseId?: string;
}) => {
  if (subCaseId) {
    return `/${encodeURIComponent(id)}/sub-cases/${encodeURIComponent(subCaseId)}${appendSearch(
      search ?? undefined
    )}`;
  }
  return `/${encodeURIComponent(id)}${appendSearch(search ?? undefined)}`;
};

export const getCaseDetailsUrlWithCommentId = ({
  id,
  commentId,
  search,
  subCaseId,
}: {
  id: string;
  commentId: string;
  search?: string | null;
  subCaseId?: string;
}) => {
  if (subCaseId) {
    return `/${encodeURIComponent(id)}/sub-cases/${encodeURIComponent(
      subCaseId
    )}/${encodeURIComponent(commentId)}${appendSearch(search ?? undefined)}`;
  }
  return `/${encodeURIComponent(id)}/${encodeURIComponent(commentId)}${appendSearch(
    search ?? undefined
  )}`;
};

export const getCreateCaseUrl = (search?: string | null) =>
  `/create${appendSearch(search ?? undefined)}`;

export const getConfigureCasesUrl = (search?: string) =>
  `/configure${appendSearch(search ?? undefined)}`;
