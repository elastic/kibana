/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseResponse } from '../../../common/api';
import { getTypeProps, CaseResponseRt } from '../../../common/api';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { bulkGet } from './bulk_get';

describe('bulkGet', () => {
  describe('throwErrorIfCaseIdsReachTheLimit', () => {
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('throws if the requested cases are more than 1000', async () => {
      const ids = Array(1001).fill('test');

      await expect(bulkGet({ ids }, clientArgs)).rejects.toThrow(
        'Maximum request limit of 1000 cases reached'
      );
    });
  });

  describe('throwErrorIfFieldsAreInvalid', () => {
    const caseSO = mockCases[0];
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.getCases.mockResolvedValue({ saved_objects: [caseSO] });
    clientArgs.services.attachmentService.getter.getCaseCommentStats.mockResolvedValue(new Map());

    clientArgs.authorization.getAndEnsureAuthorizedEntities.mockResolvedValue({
      authorized: [caseSO],
      unauthorized: [],
    });

    const typeProps = getTypeProps(CaseResponseRt) ?? {};
    const validFields = Object.keys(typeProps) as Array<keyof CaseResponse>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it.each(validFields)('supports valid field: %s', async (field) => {
      const ids = ['test'];

      await expect(bulkGet({ ids, fields: [field] }, clientArgs)).resolves.not.toThrow();
    });

    it('throws if the requested field is not valid', async () => {
      const ids = ['test'];

      // @ts-expect-error
      await expect(bulkGet({ ids, fields: ['not-valid'] }, clientArgs)).rejects.toThrow(
        'Failed to bulk get cases: test: Error: Field: not-valid is not supported'
      );
    });

    it('throws for nested fields', async () => {
      const ids = ['test'];

      // @ts-expect-error
      await expect(bulkGet({ ids, fields: ['created_by.username'] }, clientArgs)).rejects.toThrow(
        'Failed to bulk get cases: test: Error: Field: created_by.username is not supported'
      );
    });
  });
});
