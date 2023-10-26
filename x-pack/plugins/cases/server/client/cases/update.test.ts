/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../common/types/domain';
import {
  MAX_CATEGORY_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGS_PER_CASE,
  MAX_LENGTH_PER_TAG,
  MAX_TITLE_LENGTH,
  MAX_CASES_TO_UPDATE,
  MAX_USER_ACTIONS_PER_CASE,
  MAX_ASSIGNEES_PER_CASE,
  MAX_CUSTOM_FIELDS_PER_CASE,
} from '../../../common/constants';
import { mockCases } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
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
  const casesClientMock = createCasesClientMock();
  casesClientMock.configure.get = jest.fn().mockResolvedValue([]);

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
      await update(cases, clientArgs, casesClientMock);

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
          clientArgs,
          casesClientMock
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

      await expect(update(cases, clientArgs, casesClientMock)).rejects.toThrow(
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
        clientArgs,
        casesClientMock
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
        clientArgs,
        casesClientMock
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
        clientArgs,
        casesClientMock
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
        clientArgs,
        casesClientMock
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
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to update case, ids: [{\\"id\\":\\"mock-id-1\\",\\"version\\":\\"WzAsMV0=\\"}]: Error: invalid keys \\"foo\\""`
      );
    });

    it('should throw an error if the assignees array length is too long', async () => {
      const assignees = Array(MAX_ASSIGNEES_PER_CASE + 1).fill({ uid: 'foo' });

      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                assignees,
              },
            ],
          },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The length of the field assignees is too long. Array must be of length <= 10.'
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The category field cannot be an empty string.,Invalid value "   " supplied to "cases,category"'
      );
    });

    it('should trim category', async () => {
      await update(
        {
          cases: [
            {
              id: mockCases[0].id,
              version: mockCases[0].version ?? '',
              category: 'security     ',
            },
          ],
        },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.caseService.patchCases).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [
            {
              caseId: mockCases[0].id,
              version: mockCases[0].version,
              originalCase: {
                ...mockCases[0],
              },
              updatedAttributes: {
                category: 'security',
                updated_at: expect.any(String),
                updated_by: expect.any(Object),
              },
            },
          ],
          refresh: false,
        })
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The title field cannot be an empty string.'
      );
    });

    it('should trim title', async () => {
      await update(
        {
          cases: [
            {
              id: mockCases[0].id,
              version: mockCases[0].version ?? '',
              title: 'title with spaces      ',
            },
          ],
        },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.caseService.patchCases).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [
            {
              caseId: mockCases[0].id,
              version: mockCases[0].version,
              originalCase: {
                ...mockCases[0],
              },
              updatedAttributes: {
                title: 'title with spaces',
                updated_at: expect.any(String),
                updated_by: expect.any(Object),
              },
            },
          ],
          refresh: false,
        })
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The description field cannot be an empty string.'
      );
    });

    it('should trim description', async () => {
      await update(
        {
          cases: [
            {
              id: mockCases[0].id,
              version: mockCases[0].version ?? '',
              description: 'This is a description with spaces!!      ',
            },
          ],
        },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.caseService.patchCases).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [
            {
              caseId: mockCases[0].id,
              version: mockCases[0].version,
              originalCase: {
                ...mockCases[0],
              },
              updatedAttributes: {
                description: 'This is a description with spaces!!',
                updated_at: expect.any(String),
                updated_by: expect.any(Object),
              },
            },
          ],
          refresh: false,
        })
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
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
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        'Failed to update case, ids: [{"id":"mock-id-1","version":"WzAsMV0="}]: Error: The tag field cannot be an empty string.'
      );
    });

    it('should trim tags', async () => {
      await update(
        {
          cases: [
            {
              id: mockCases[0].id,
              version: mockCases[0].version ?? '',
              tags: ['coke      ', 'pepsi'],
            },
          ],
        },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.caseService.patchCases).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [
            {
              caseId: mockCases[0].id,
              version: mockCases[0].version,
              originalCase: {
                ...mockCases[0],
              },
              updatedAttributes: {
                tags: ['coke', 'pepsi'],
                updated_at: expect.any(String),
                updated_by: expect.any(Object),
              },
            },
          ],
          refresh: false,
        })
      );
    });
  });

  describe('Custom Fields', () => {
    const clientArgs = createCasesClientMockArgs();
    const casesClient = createCasesClientMock();

    beforeEach(() => {
      jest.clearAllMocks();
      clientArgs.services.caseService.getCases.mockResolvedValue({ saved_objects: mockCases });
      clientArgs.services.caseService.getAllCaseComments.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 10,
        page: 1,
      });

      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'missing field 1',
              required: true,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ],
        },
      ]);
    });

    it('can update customFields', async () => {
      const customFields = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT as const,
          value: 'this is a text field value',
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE as const,
          value: null,
        },
      ];

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
                customFields,
              },
            ],
          },
          clientArgs,
          casesClient
        )
      ).resolves.not.toThrow();

      expect(clientArgs.services.caseService.patchCases).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [
            {
              caseId: mockCases[0].id,
              version: mockCases[0].version,
              originalCase: {
                ...mockCases[0],
              },
              updatedAttributes: {
                customFields,
                updated_at: expect.any(String),
                updated_by: expect.any(Object),
              },
            },
          ],
          refresh: false,
        })
      );
    });

    it('fills out missing custom fields', async () => {
      const customFields = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT as const,
          value: 'this is a text field value',
        },
      ];

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
                customFields,
              },
            ],
          },
          clientArgs,
          casesClient
        )
      ).resolves.not.toThrow();

      expect(clientArgs.services.caseService.patchCases).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [
            {
              caseId: mockCases[0].id,
              version: mockCases[0].version,
              originalCase: {
                ...mockCases[0],
              },
              updatedAttributes: {
                customFields: [
                  ...customFields,
                  {
                    key: 'second_key',
                    type: CustomFieldTypes.TOGGLE as const,
                    value: null,
                  },
                ],
                updated_at: expect.any(String),
                updated_by: expect.any(Object),
              },
            },
          ],
          refresh: false,
        })
      );
    });

    it('throws error when the customFields array is too long', async () => {
      const customFields = Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
        key: 'first_custom_field_key',
        type: 'text',
        value: 'this is a text field value',
      });

      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                customFields,
              },
            ],
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to update case, ids: [{\\"id\\":\\"mock-id-1\\",\\"version\\":\\"WzAsMV0=\\"}]: Error: The length of the field customFields is too long. Array must be of length <= 10."`
      );
    });

    it('throws with duplicated customFields keys', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                customFields: [
                  {
                    key: 'duplicated_key',
                    type: CustomFieldTypes.TEXT,
                    value: 'this is a text field value',
                  },
                  {
                    key: 'duplicated_key',
                    type: CustomFieldTypes.TEXT,
                    value: 'this is a text field value',
                  },
                ],
              },
            ],
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to update case, ids: [{\\"id\\":\\"mock-id-1\\",\\"version\\":\\"WzAsMV0=\\"}]: Error: Invalid duplicated custom field keys in request: duplicated_key"`
      );
    });

    it('throws when customFields keys are not present in configuration', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                customFields: [
                  {
                    key: 'first_key',
                    type: CustomFieldTypes.TEXT,
                    value: 'this is a text field value',
                  },
                  {
                    key: 'missing_key',
                    type: CustomFieldTypes.TEXT,
                    value: null,
                  },
                ],
              },
            ],
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to update case, ids: [{\\"id\\":\\"mock-id-1\\",\\"version\\":\\"WzAsMV0=\\"}]: Error: Invalid custom field keys: missing_key"`
      );
    });

    it('throws error when custom fields are missing', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                customFields: [
                  {
                    key: 'second_key',
                    type: CustomFieldTypes.TOGGLE,
                    value: null,
                  },
                ],
              },
            ],
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to update case, ids: [{\\"id\\":\\"mock-id-1\\",\\"version\\":\\"WzAsMV0=\\"}]: Error: Missing required custom fields: \\"missing field 1\\""`
      );
    });

    it('throws when the customField types dont match the configuration', async () => {
      await expect(
        update(
          {
            cases: [
              {
                id: mockCases[0].id,
                version: mockCases[0].version ?? '',
                customFields: [
                  {
                    key: 'first_key',
                    type: CustomFieldTypes.TOGGLE,
                    value: true,
                  },
                  {
                    key: 'second_key',
                    type: CustomFieldTypes.TEXT,
                    value: 'foobar',
                  },
                ],
              },
            ],
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to update case, ids: [{\\"id\\":\\"mock-id-1\\",\\"version\\":\\"WzAsMV0=\\"}]: Error: The following custom fields have the wrong type in the request: first_key,second_key"`
      );
    });
  });

  describe('Validation', () => {
    const clientArgsMock = createCasesClientMockArgs();

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
          clientArgsMock,
          casesClientMock
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
          clientArgsMock,
          casesClientMock
        )
      ).rejects.toThrow(
        'Error: The length of the field cases is too short. Array must be of length >= 1.'
      );
    });

    describe('Validate max user actions per page', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        clientArgsMock.services.caseService.getCases.mockResolvedValue({
          saved_objects: [{ ...mockCases[0] }, { ...mockCases[1] }],
        });
        clientArgsMock.services.caseService.getAllCaseComments.mockResolvedValue({
          saved_objects: [],
          total: 0,
          per_page: 10,
          page: 1,
        });
      });

      it('passes validation if max user actions per case is not reached', async () => {
        clientArgsMock.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue(
          {
            [mockCases[0].id]: MAX_USER_ACTIONS_PER_CASE - 1,
          }
        );

        // @ts-ignore: only the array length matters here
        clientArgsMock.services.userActionService.creator.buildUserActions.mockReturnValue({
          [mockCases[0].id]: [1],
        });

        clientArgsMock.services.caseService.patchCases.mockResolvedValue({
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
            clientArgsMock,
            casesClientMock
          )
        ).resolves.not.toThrow();
      });

      it(`throws an error when the user actions to be created will reach ${MAX_USER_ACTIONS_PER_CASE}`, async () => {
        clientArgsMock.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue(
          {
            [mockCases[0].id]: MAX_USER_ACTIONS_PER_CASE,
          }
        );

        // @ts-ignore: only the array length matters here
        clientArgsMock.services.userActionService.creator.buildUserActions.mockReturnValue({
          [mockCases[0].id]: [1, 2, 3],
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
            clientArgsMock,
            casesClientMock
          )
        ).rejects.toThrow(
          `Error: The case with case id ${mockCases[0].id} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
        );
      });

      it('throws an error when trying to update multiple cases and one of them is expected to fail', async () => {
        clientArgsMock.services.userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue(
          {
            [mockCases[0].id]: MAX_USER_ACTIONS_PER_CASE,
            [mockCases[1].id]: 0,
          }
        );

        // @ts-ignore: only the array length matters here
        clientArgsMock.services.userActionService.creator.buildUserActions.mockReturnValue({
          [mockCases[0].id]: [1, 2, 3],
          [mockCases[1].id]: [1],
        });

        await expect(
          update(
            {
              cases: [
                {
                  id: mockCases[0].id,
                  version: mockCases[0].version ?? '',
                  title: 'This is supposed to fail',
                },

                {
                  id: mockCases[1].id,
                  version: mockCases[1].version ?? '',
                  title: 'This is supposed to pass',
                },
              ],
            },
            clientArgsMock,
            casesClientMock
          )
        ).rejects.toThrow(
          `Error: The case with case id ${mockCases[0].id} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
        );
      });
    });
  });
});
