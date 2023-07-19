/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_CATEGORY_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGS_PER_CASE,
  MAX_LENGTH_PER_TAG,
  MAX_TITLE_LENGTH,
  MAX_CASES_TO_UPDATE,
} from '../../../common/constants';
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

    it('should throw an error when an invalid field is included in the request payload', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                assignees: [{ uid: '1' }],
                // @ts-expect-error invalid field
                foo: 'bar',
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to update case, ids: [{\\"id\\":\\"mock-id-1\\",\\"version\\":\\"WzAsMV0=\\"}]: Error: invalid keys \\"foo\\""`
      );
    });
  });

  describe('Category', () => {
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
    });

    it(`does not throw error when category is non empty string less than ${MAX_CATEGORY_LENGTH} characters`, async () => {
      clientArgs.services.caseService.patchCases.mockResolvedValue({
        saved_objects: [{ ...mockCases[0] }],
      });

      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                category: 'foobar',
              },
            ],
          },
          clientArgs
        )
      ).resolves.not.toThrow();
    });

    it('does not update the category if the length is too long', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                category: 'A very long category with more than fifty characters!',
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The length of the category is too long. The maximum length is ${MAX_CATEGORY_LENGTH}.,Invalid value \"A very long category with more than fifty characters!\" supplied to \"cases,category\"`
      );
    });

    it('throws error if category is just an empty string', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                category: '',
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The category field cannot be an empty string.,Invalid value "" supplied to "cases,category"'
      );
    });

    it('throws error if category is a string with empty characters', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                category: '   ',
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The category field cannot be an empty string.,Invalid value "   " supplied to "cases,category"'
      );
    });
  });

  describe('Title', () => {
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
    });

    it(`does not throw error when title is non empty string less than ${MAX_TITLE_LENGTH} characters`, async () => {
      clientArgs.services.caseService.patchCases.mockResolvedValue({
        saved_objects: [{ ...mockCases[0] }],
      });

      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                title: 'This is a test case!!',
              },
            ],
          },
          clientArgs
        )
      ).resolves.not.toThrow();
    });

    it('throws error if the title is too long', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                title:
                  'This is a very long title with more than one hundred and sixty characters!! To confirm the maximum limit error thrown for more than one hundred and sixty characters!!',
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The length of the title is too long. The maximum length is ${MAX_TITLE_LENGTH}.`
      );
    });

    it('throws error if title is just an empty string', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                title: '',
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The title field cannot be an empty string.'
      );
    });

    it('throws error if title is a string with empty characters', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                title: '   ',
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The title field cannot be an empty string.'
      );
    });
  });

  describe('Description', () => {
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
    });

    it(`does not throw error when description is non empty string less than ${MAX_DESCRIPTION_LENGTH} characters`, async () => {
      clientArgs.services.caseService.patchCases.mockResolvedValue({
        saved_objects: [{ ...mockCases[0] }],
      });

      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                description: 'New updated description!!',
              },
            ],
          },
          clientArgs
        )
      ).resolves.not.toThrow();
    });

    it('throws error when the description is too long', async () => {
      const description = Array(MAX_DESCRIPTION_LENGTH + 1)
        .fill('a')
        .toString();

      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                description,
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The length of the description is too long. The maximum length is ${MAX_DESCRIPTION_LENGTH}.`
      );
    });

    it('throws error if description is just an empty string', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                description: '',
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The description field cannot be an empty string.'
      );
    });

    it('throws error if description is a string with empty characters', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                description: '   ',
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The description field cannot be an empty string.'
      );
    });
  });

  describe('Tags', () => {
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
    });

    it('does not throw error when tags array is empty', async () => {
      clientArgs.services.caseService.patchCases.mockResolvedValue({
        saved_objects: [{ ...mockCases[0] }],
      });

      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                tags: [],
              },
            ],
          },
          clientArgs
        )
      ).resolves.not.toThrow();
    });

    it(`does not throw error when tags array length is less than ${MAX_TAGS_PER_CASE} and tag has ${MAX_LENGTH_PER_TAG} characters`, async () => {
      clientArgs.services.caseService.patchCases.mockResolvedValue({
        saved_objects: [{ ...mockCases[0] }],
      });

      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                tags: ['foo', 'bar'],
              },
            ],
          },
          clientArgs
        )
      ).resolves.not.toThrow();
    });

    it('throws error if the tags array length is too long', async () => {
      const tags = Array(MAX_TAGS_PER_CASE + 1).fill('foo');

      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                tags,
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The length of the field tags is too long. Array must be of length <= ${MAX_TAGS_PER_CASE}.`
      );
    });

    it('throws error if the tag length is too long', async () => {
      const tag = Array(MAX_LENGTH_PER_TAG + 1)
        .fill('f')
        .toString();

      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                tags: [tag],
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The length of the tag is too long. The maximum length is ${MAX_LENGTH_PER_TAG}.`
      );
    });

    it('throws error if tag is empty string', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                tags: [''],
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The tag field cannot be an empty string.'
      );
    });

    it('throws error if tag is a string with empty characters', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                tags: ['   '],
              },
            ],
          },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The tag field cannot be an empty string.'
      );
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(`throws an error when trying to update more than ${MAX_CASES_TO_UPDATE} cases`, async () => {
      await expect(
        update(
          {
            cases: Array(MAX_CASES_TO_UPDATE + 1).fill({
              id: mockCases[0].id,
              version: mockCases[0].version ?? '',
              title: 'This is a test case!!',
            }),
          },
          createCasesClientMockArgs()
        )
      ).rejects.toThrow(
        'Error: The length of the field cases is too long. Array must be of length <= 100.'
      );
    });

    it('throws an error when trying to update zero cases', async () => {
      await expect(
        update(
          {
            cases: [],
          },
          createCasesClientMockArgs()
        )
      ).rejects.toThrow(
        'Error: The length of the field cases is too short. Array must be of length >= 1.'
      );
    });
  });
});
