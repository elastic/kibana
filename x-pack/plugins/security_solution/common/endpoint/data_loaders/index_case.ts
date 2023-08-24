/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { Case, CasePostRequest } from '@kbn/cases-plugin/common';
import { CaseSeverity, CASES_URL, ConnectorTypes } from '@kbn/cases-plugin/common';
import type { AxiosError } from 'axios';
import { EndpointError } from '../errors';

export interface IndexedCase {
  data: Case;
  cleanup: () => Promise<{
    /** The ID of the cases that were deleted */
    data: string;
  }>;
}

export interface DeletedIndexedCase {
  data: string;
}

/**
 * Creates a new case in security solution
 *
 * @param kbnClient
 * @param newCase
 */
export const indexCase = async (
  kbnClient: KbnClient,
  newCase: Partial<CasePostRequest> = {}
): Promise<IndexedCase> => {
  const newCaseReq: CasePostRequest = {
    title: `Malware Investigation (${Math.random().toString(32).substring(2, 6)})`,
    tags: [],
    severity: CaseSeverity.LOW,
    description: 'foo',
    assignees: [],
    connector: {
      id: 'none',
      name: 'none',
      type: ConnectorTypes.none,
      fields: null,
    },
    settings: {
      syncAlerts: true,
    },
    owner: 'securitySolution',
    ...newCase,
  };

  const createdCase = (
    await kbnClient.request<Case>({
      method: 'POST',
      path: CASES_URL,
      body: newCaseReq,
    })
  ).data;

  return {
    data: createdCase,
    cleanup: deleteIndexedCase.bind(undefined, kbnClient, createdCase),
  };
};

export const deleteIndexedCase = async (
  kbnClient: KbnClient,
  data: IndexedCase['data']
): Promise<DeletedIndexedCase> => {
  try {
    await kbnClient.request({
      method: 'DELETE',
      path: CASES_URL,
      query: {
        ids: JSON.stringify([data.id]),
      },
    });
  } catch (_error) {
    const error = _error as AxiosError;

    // ignore 404 (not found) -data has already been deleted
    if ((error as AxiosError).response?.status !== 404) {
      const message = `${error.message}
  Request:
    ${error.request.method} ${error.request.path}
  Response Body:
    ${JSON.stringify(error.response?.data ?? {}, null, 2)}`;

      throw new EndpointError(message, error);
    }
  }

  return { data: data.id };
};
