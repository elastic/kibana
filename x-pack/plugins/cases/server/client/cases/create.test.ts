/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { CaseSeverity, ConnectorTypes } from '../../../common/api';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { create } from './create';

describe('create', () => {
  const theCase = {
    title: 'My Case',
    tags: [],
    description: 'testing sir',
    connector: {
      id: '.none',
      name: 'None',
      type: ConnectorTypes.none,
      fields: null,
    },
    settings: { syncAlerts: true },
    severity: CaseSeverity.LOW,
    owner: SECURITY_SOLUTION_OWNER,
    assignees: [{ uid: '1' }],
  };

  const caseSO = mockCases[0];

  describe('Assignees', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.postNewCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('notifies single assignees', async () => {
      await create(theCase, clientArgs);

      expect(clientArgs.services.notificationService.notifyAssignees).toHaveBeenCalledWith({
        assignees: theCase.assignees,
        theCase: caseSO,
      });
    });

    it('notifies multiple assignees', async () => {
      await create({ ...theCase, assignees: [{ uid: '1' }, { uid: '2' }] }, clientArgs);

      expect(clientArgs.services.notificationService.notifyAssignees).toHaveBeenCalledWith({
        assignees: [{ uid: '1' }, { uid: '2' }],
        theCase: caseSO,
      });
    });

    it('does not notify when there are no assignees', async () => {
      await create({ ...theCase, assignees: [] }, clientArgs);

      expect(clientArgs.services.notificationService.notifyAssignees).not.toHaveBeenCalled();
    });

    it('does not notify the current user', async () => {
      await create(
        {
          ...theCase,
          assignees: [{ uid: '1' }, { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
        },
        clientArgs
      );

      expect(clientArgs.services.notificationService.notifyAssignees).toHaveBeenCalledWith({
        assignees: [{ uid: '1' }],
        theCase: caseSO,
      });
    });
  });

  describe('Attributes', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.postNewCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw an error when an excess field exists', async () => {
      await expect(
        // @ts-expect-error foo is an invalid field
        create({ ...theCase, foo: 'bar' }, clientArgs)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to create case: Error: invalid keys \\"foo\\""`
      );
    });

    it('should throw an error if the category length is too long', async () => {
      await expect(
        create(
          { ...theCase, category: 'A very long category with more than fifty characters!' },
          clientArgs
        )
      ).rejects.toThrow('Failed to create case: Error: The length of the category is too long.');
    });

    it('should throw an error if the category is an empty string', async () => {
      await expect(create({ ...theCase, category: '' }, clientArgs)).rejects.toThrow(
        'Failed to create case: Error: The category cannot be an empty string.'
      );
    });

    it('should throw an error if the category is a string with empty characters', async () => {
      await expect(create({ ...theCase, category: '   ' }, clientArgs)).rejects.toThrow(
        'Failed to create case: Error: The category cannot be an empty string.'
      );
    });
  });
});
