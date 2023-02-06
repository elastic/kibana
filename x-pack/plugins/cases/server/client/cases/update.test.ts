/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { update } from './update';

describe('update', () => {
  const cases = {
    cases: [
      {
        id: mockCases[0].id,
        version: mockCases[0].version ?? '',
        assignees: [{ uid: '1' }],
      },
    ],
  };

  describe('Assignees', () => {
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
      clientArgs.services.caseService.getCases.mockResolvedValue({ saved_objects: mockCases });
      clientArgs.services.caseService.getAllCaseComments.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 10,
        page: 1,
      });

      clientArgs.services.caseService.patchCases.mockResolvedValue({
        saved_objects: [{ ...mockCases[0], attributes: { assignees: cases.cases[0].assignees } }],
      });
    });

    it('notifies an assignee', async () => {
      await update(cases, clientArgs);

      expect(clientArgs.services.notificationService.bulkNotifyAssignees).toHaveBeenCalledWith([
        {
          assignees: [{ uid: '1' }],
          theCase: {
            ...mockCases[0],
            attributes: { ...mockCases[0].attributes, assignees: [{ uid: '1' }] },
          },
        },
      ]);
    });

    it('does not notify if the case does not exist', async () => {
      expect.assertions(2);

      await expect(
        update(
          {
            cases: [
              {
                id: 'not-exists',
                version: '123',
                assignees: [{ uid: '1' }],
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"not-exists","version":"123"}]: Error: These cases not-exists do not exist. Please check you have the correct ids.'
      );

      expect(clientArgs.services.notificationService.bulkNotifyAssignees).not.toHaveBeenCalled();
    });

    it('does not notify if the case is patched with the same assignee', async () => {
      expect.assertions(2);

      clientArgs.services.caseService.getCases.mockResolvedValue({
        saved_objects: [
          {
            ...mockCases[0],
            attributes: { ...mockCases[0].attributes, assignees: [{ uid: '1' }] },
          },
        ],
      });

      await expect(update(cases, clientArgs)).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: All update fields are identical to current version.'
      );

      expect(clientArgs.services.notificationService.bulkNotifyAssignees).not.toHaveBeenCalled();
    });

    it('notifies only new users', async () => {
      clientArgs.services.caseService.getCases.mockResolvedValue({
        saved_objects: [
          {
            ...mockCases[0],
            attributes: { ...mockCases[0].attributes, assignees: [{ uid: '1' }] },
          },
        ],
      });

      clientArgs.services.caseService.patchCases.mockResolvedValue({
        saved_objects: [
          {
            ...mockCases[0],
            attributes: { assignees: [{ uid: '1' }, { uid: '2' }, { uid: '3' }] },
          },
        ],
      });

      await update(
        {
          cases: [
            {
              id: mockCases[0].id,
              version: mockCases[0].version ?? '',
              assignees: [{ uid: '1' }, { uid: '2' }, { uid: '3' }],
            },
          ],
        },
        clientArgs
      );

      expect(clientArgs.services.notificationService.bulkNotifyAssignees).toHaveBeenCalledWith([
        {
          assignees: [{ uid: '2' }, { uid: '3' }],
          theCase: {
            ...mockCases[0],
            attributes: {
              ...mockCases[0].attributes,
              assignees: [{ uid: '1' }, { uid: '2' }, { uid: '3' }],
            },
          },
        },
      ]);
    });

    it('does not notify when removing assignees', async () => {
      clientArgs.services.caseService.getCases.mockResolvedValue({
        saved_objects: [
          {
            ...mockCases[0],
            attributes: { ...mockCases[0].attributes, assignees: [{ uid: '1' }, { uid: '2' }] },
          },
        ],
      });

      clientArgs.services.caseService.patchCases.mockResolvedValue({
        saved_objects: [{ ...mockCases[0], attributes: { assignees: [{ uid: '1' }] } }],
      });

      await update(
        {
          cases: [
            {
              id: mockCases[0].id,
              version: mockCases[0].version ?? '',
              assignees: [{ uid: '1' }],
            },
          ],
        },
        clientArgs
      );

      expect(clientArgs.services.notificationService.bulkNotifyAssignees).toHaveBeenCalledWith([]);
      expect(clientArgs.services.notificationService.notifyAssignees).not.toHaveBeenCalled();
    });

    it('does not notify the current user', async () => {
      clientArgs.services.caseService.getCases.mockResolvedValue({
        saved_objects: [
          {
            ...mockCases[0],
            attributes: { ...mockCases[0].attributes, assignees: [{ uid: '1' }] },
          },
        ],
      });

      clientArgs.services.caseService.patchCases.mockResolvedValue({
        saved_objects: [
          {
            ...mockCases[0],
            attributes: {
              assignees: [{ uid: '2' }, { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
            },
          },
        ],
      });

      await update(
        {
          cases: [
            {
              id: mockCases[0].id,
              version: mockCases[0].version ?? '',
              assignees: [{ uid: '2' }, { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
            },
          ],
        },
        clientArgs
      );

      expect(clientArgs.services.notificationService.bulkNotifyAssignees).toHaveBeenCalledWith([
        {
          assignees: [{ uid: '2' }],
          theCase: {
            ...mockCases[0],
            attributes: {
              ...mockCases[0].attributes,
              assignees: [{ uid: '2' }, { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
            },
          },
        },
      ]);
    });

    it('does not notify when there are no new assignees', async () => {
      clientArgs.services.caseService.getCases.mockResolvedValue({
        saved_objects: [
          {
            ...mockCases[0],
            attributes: { ...mockCases[0].attributes, assignees: [{ uid: '1' }] },
          },
        ],
      });

      await update(
        {
          cases: [
            {
              id: mockCases[0].id,
              version: mockCases[0].version ?? '',
              assignees: [{ uid: '1' }, { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
            },
          ],
        },
        clientArgs
      );

      /**
       * Current user is filtered out. Assignee with uid=1 should not be
       * notified because it was already assigned to the case.
       */
      expect(clientArgs.services.notificationService.bulkNotifyAssignees).toHaveBeenCalledWith([]);
      expect(clientArgs.services.notificationService.notifyAssignees).not.toHaveBeenCalled();
    });
  });
});
