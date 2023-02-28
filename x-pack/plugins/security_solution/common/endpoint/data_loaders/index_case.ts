/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { CaseResponse } from '@kbn/cases-plugin/common';
import { CASES_URL } from '@kbn/cases-plugin/common';
import type { CasePostRequest } from '@kbn/cases-plugin/common/api';
import { CaseSeverity, ConnectorTypes } from '@kbn/cases-plugin/common/api';

export interface IndexedCase {
  case: CaseResponse;
  cleanup: () => Promise<void>;
}

/**
 * Creates a new case in security solution
 *
 * @param kbnClient
 * @param name
 */
export const indexCase = async (
  kbnClient: KbnClient,
  newCase: Partial<CasePostRequest> = {}
): Promise<IndexedCase> => {
  const newCaseReq: CasePostRequest = {
    title: 'Malware Investigation',
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
    await kbnClient.request<CaseResponse>({
      method: 'POST',
      path: CASES_URL,
      body: newCaseReq,
    })
  ).data;

  const cleanup = async (): Promise<void> => {
    await kbnClient.request({
      method: 'DELETE',
      path: CASES_URL,
      query: {
        ids: [createdCase.id],
      },
    });
  };

  return {
    case: createdCase,
    cleanup,
  };
};
