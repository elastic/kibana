/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGS_PER_CASE,
  MAX_LENGTH_PER_TAG,
  MAX_TITLE_LENGTH,
  MAX_ASSIGNEES_PER_CASE,
  MAX_CUSTOM_FIELDS_PER_CASE,
} from '../../../common/constants';
import type { CasePostRequest } from '../../../common';
import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { mockCases } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { create, throwIfCustomFieldKeysInvalid, throwIfMissingRequiredCustomField } from './create';
import {
  CaseSeverity,
  CaseStatuses,
  ConnectorTypes,
  CustomFieldTypes,
} from '../../../common/types/domain';

import type { CaseCustomFields } from '../../../common/types/domain';

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
  const casesClientMock = createCasesClientMock();
  casesClientMock.configure.get = jest.fn().mockResolvedValue([]);

  describe('Assignees', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.postNewCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('notifies single assignees', async () => {
      await create(theCase, clientArgs, casesClientMock);

      expect(clientArgs.services.notificationService.notifyAssignees).toHaveBeenCalledWith({
        assignees: theCase.assignees,
        theCase: caseSO,
      });
    });

    it('notifies multiple assignees', async () => {
      await create(
        { ...theCase, assignees: [{ uid: '1' }, { uid: '2' }] },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.notificationService.notifyAssignees).toHaveBeenCalledWith({
        assignees: [{ uid: '1' }, { uid: '2' }],
        theCase: caseSO,
      });
    });

    it('does not notify when there are no assignees', async () => {
      await create({ ...theCase, assignees: [] }, clientArgs, casesClientMock);

      expect(clientArgs.services.notificationService.notifyAssignees).not.toHaveBeenCalled();
    });

    it('does not notify the current user', async () => {
      await create(
        {
          ...theCase,
          assignees: [{ uid: '1' }, { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
        },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.notificationService.notifyAssignees).toHaveBeenCalledWith({
        assignees: [{ uid: '1' }],
        theCase: caseSO,
      });
    });

    it('should throw an error if the assignees array length is too long', async () => {
      const assignees = Array(MAX_ASSIGNEES_PER_CASE + 1).fill({ uid: 'foo' });

      await expect(create({ ...theCase, assignees }, clientArgs, casesClientMock)).rejects.toThrow(
        `Failed to create case: Error: The length of the field assignees is too long. Array must be of length <= ${MAX_ASSIGNEES_PER_CASE}.`
      );
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
        create({ ...theCase, foo: 'bar' }, clientArgs, casesClientMock)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to create case: Error: invalid keys \\"foo\\""`
      );
    });
  });

  describe('title', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.postNewCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(`should not throw an error if the title is non empty and less than ${MAX_TITLE_LENGTH} characters`, async () => {
      await expect(
        create({ ...theCase, title: 'This is a test case!!' }, clientArgs, casesClientMock)
      ).resolves.not.toThrow();
    });

    it('should throw an error if the title length is too long', async () => {
      await expect(
        create(
          {
            ...theCase,
            title:
              'This is a very long title with more than one hundred and sixty characters!! To confirm the maximum limit error thrown for more than one hundred and sixty characters!!',
          },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        `Failed to create case: Error: The length of the title is too long. The maximum length is ${MAX_TITLE_LENGTH}.`
      );
    });

    it('should throw an error if the title is an empty string', async () => {
      await expect(create({ ...theCase, title: '' }, clientArgs, casesClientMock)).rejects.toThrow(
        'Failed to create case: Error: The title field cannot be an empty string.'
      );
    });

    it('should throw an error if the title is a string with empty characters', async () => {
      await expect(
        create({ ...theCase, title: '   ' }, clientArgs, casesClientMock)
      ).rejects.toThrow('Failed to create case: Error: The title field cannot be an empty string.');
    });

    it('should trim title', async () => {
      await create({ ...theCase, title: 'title with spaces      ' }, clientArgs, casesClientMock);

      expect(clientArgs.services.caseService.postNewCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: {
            ...theCase,
            closed_by: null,
            closed_at: null,
            title: 'title with spaces',
            created_at: expect.any(String),
            created_by: expect.any(Object),
            updated_at: null,
            updated_by: null,
            external_service: null,
            duration: null,
            status: CaseStatuses.open,
            category: null,
            customFields: [],
          },
          id: expect.any(String),
          refresh: false,
        })
      );
    });
  });

  describe('description', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.postNewCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(`should not throw an error if the description is non empty and less than ${MAX_DESCRIPTION_LENGTH} characters`, async () => {
      await expect(
        create(
          { ...theCase, description: 'This is a test description!!' },
          clientArgs,
          casesClientMock
        )
      ).resolves.not.toThrow();
    });

    it('should throw an error if the description length is too long', async () => {
      const description = Array(MAX_DESCRIPTION_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        create({ ...theCase, description }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        `Failed to create case: Error: The length of the description is too long. The maximum length is ${MAX_DESCRIPTION_LENGTH}.`
      );
    });

    it('should throw an error if the description is an empty string', async () => {
      await expect(
        create({ ...theCase, description: '' }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to create case: Error: The description field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        create({ ...theCase, description: '   ' }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to create case: Error: The description field cannot be an empty string.'
      );
    });

    it('should trim description', async () => {
      await create(
        { ...theCase, description: 'this is a description with spaces!!      ' },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.caseService.postNewCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: {
            ...theCase,
            closed_by: null,
            closed_at: null,
            description: 'this is a description with spaces!!',
            created_at: expect.any(String),
            created_by: expect.any(Object),
            updated_at: null,
            updated_by: null,
            external_service: null,
            duration: null,
            status: CaseStatuses.open,
            category: null,
            customFields: [],
          },
          id: expect.any(String),
          refresh: false,
        })
      );
    });
  });

  describe('tags', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.postNewCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not throw an error if the tags array is empty', async () => {
      await expect(
        create({ ...theCase, tags: [] }, clientArgs, casesClientMock)
      ).resolves.not.toThrow();
    });

    it('should not throw an error if the tags array has non empty string within limit', async () => {
      await expect(
        create({ ...theCase, tags: ['abc'] }, clientArgs, casesClientMock)
      ).resolves.not.toThrow();
    });

    it('should throw an error if the tags array length is too long', async () => {
      const tags = Array(MAX_TAGS_PER_CASE + 1).fill('foo');

      await expect(create({ ...theCase, tags }, clientArgs, casesClientMock)).rejects.toThrow(
        `Failed to create case: Error: The length of the field tags is too long. Array must be of length <= ${MAX_TAGS_PER_CASE}.`
      );
    });

    it('should throw an error if the tags array has empty string', async () => {
      await expect(create({ ...theCase, tags: [''] }, clientArgs, casesClientMock)).rejects.toThrow(
        'Failed to create case: Error: The tag field cannot be an empty string.'
      );
    });

    it('should throw an error if the tags array has string with empty characters', async () => {
      await expect(
        create({ ...theCase, tags: ['  '] }, clientArgs, casesClientMock)
      ).rejects.toThrow('Failed to create case: Error: The tag field cannot be an empty string.');
    });

    it('should throw an error if the tag length is too long', async () => {
      const tag = Array(MAX_LENGTH_PER_TAG + 1)
        .fill('f')
        .toString();

      await expect(
        create({ ...theCase, tags: [tag] }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        `Failed to create case: Error: The length of the tag is too long. The maximum length is ${MAX_LENGTH_PER_TAG}.`
      );
    });

    it('should trim tags', async () => {
      await create({ ...theCase, tags: ['pepsi     ', 'coke'] }, clientArgs, casesClientMock);

      expect(clientArgs.services.caseService.postNewCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: {
            ...theCase,
            closed_by: null,
            closed_at: null,
            tags: ['pepsi', 'coke'],
            created_at: expect.any(String),
            created_by: expect.any(Object),
            updated_at: null,
            updated_by: null,
            external_service: null,
            duration: null,
            status: CaseStatuses.open,
            category: null,
            customFields: [],
          },
          id: expect.any(String),
          refresh: false,
        })
      );
    });
  });

  describe('Category', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.postNewCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not throw an error if the category is null', async () => {
      await expect(
        create({ ...theCase, category: null }, clientArgs, casesClientMock)
      ).resolves.not.toThrow();
    });

    it('should throw an error if the category length is too long', async () => {
      await expect(
        create(
          { ...theCase, category: 'A very long category with more than fifty characters!' },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow('Failed to create case: Error: The length of the category is too long.');
    });

    it('should throw an error if the category is an empty string', async () => {
      await expect(
        create({ ...theCase, category: '' }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to create case: Error: The category field cannot be an empty string.,Invalid value "" supplied to "category"'
      );
    });

    it('should throw an error if the category is a string with empty characters', async () => {
      await expect(
        create({ ...theCase, category: '   ' }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to create case: Error: The category field cannot be an empty string.,Invalid value "   " supplied to "category"'
      );
    });

    it('should trim category', async () => {
      await create({ ...theCase, category: 'reporting       ' }, clientArgs, casesClientMock);

      expect(clientArgs.services.caseService.postNewCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: {
            ...theCase,
            closed_by: null,
            closed_at: null,
            category: 'reporting',
            created_at: expect.any(String),
            created_by: expect.any(Object),
            updated_at: null,
            updated_by: null,
            external_service: null,
            duration: null,
            status: CaseStatuses.open,
            customFields: [],
          },
          id: expect.any(String),
          refresh: false,
        })
      );
    });
  });

  describe('Custom Fields', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.postNewCase.mockResolvedValue(caseSO);

    const casesClient = createCasesClientMock();
    casesClient.configure.get = jest.fn().mockResolvedValue([
      {
        owner: theCase.owner,
        customFields: [
          {
            key: 'first_key',
            type: CustomFieldTypes.TEXT,
            label: 'foo',
            required: false,
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

    const theCustomFields: CaseCustomFields = [
      {
        key: 'first_key',
        type: CustomFieldTypes.TEXT,
        field: { value: ['this is a text field value', 'this is second'] },
      },
      {
        key: 'second_key',
        type: CustomFieldTypes.TOGGLE,
        field: { value: [true] },
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create customFields correctly', async () => {
      await expect(
        create(
          {
            ...theCase,
            customFields: theCustomFields,
          },
          clientArgs,
          casesClient
        )
      ).resolves.not.toThrow();

      expect(clientArgs.services.caseService.postNewCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: {
            ...theCase,
            closed_by: null,
            closed_at: null,
            category: null,
            created_at: expect.any(String),
            created_by: expect.any(Object),
            updated_at: null,
            updated_by: null,
            external_service: null,
            duration: null,
            status: CaseStatuses.open,
            customFields: theCustomFields,
          },
          id: expect.any(String),
          refresh: false,
        })
      );
    });

    it('should not throw an error and set default value when customFields are undefined', async () => {
      await expect(create({ ...theCase }, clientArgs, casesClient)).resolves.not.toThrow();

      expect(clientArgs.services.caseService.postNewCase).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: {
            ...theCase,
            closed_by: null,
            closed_at: null,
            category: null,
            created_at: expect.any(String),
            created_by: expect.any(Object),
            updated_at: null,
            updated_by: null,
            external_service: null,
            duration: null,
            status: CaseStatuses.open,
            customFields: [],
          },
          id: expect.any(String),
          refresh: false,
        })
      );
    });

    it('throws error when the customFields array is too long', async () => {
      await expect(
        create(
          {
            ...theCase,
            customFields: Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill(theCustomFields[0]),
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrow(
        `Failed to create case: Error: The length of the field customFields is too long. Array must be of length <= ${MAX_CUSTOM_FIELDS_PER_CASE}.`
      );
    });

    it('throws with duplicated customFields keys', async () => {
      await expect(
        create(
          {
            ...theCase,
            customFields: [
              {
                key: 'duplicated_key',
                type: CustomFieldTypes.TEXT,
                field: { value: ['this is a text field value', 'this is second'] },
              },
              {
                key: 'duplicated_key',
                type: CustomFieldTypes.TOGGLE,
                field: { value: [true] },
              },
            ],
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrow('Error: Invalid duplicated custom field keys in request: duplicated_key');
    });
  });

  describe('throwIfCustomFieldKeysInvalid', () => {
    const casesClient = createCasesClientMock();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('does not throw if all custom fields are in configuration', async () => {
      const customFields = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT as const,
          field: { value: ['this is a text field value', 'this is second'] },
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TEXT as const,
          field: { value: null },
        },
      ];

      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
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

      await expect(
        throwIfCustomFieldKeysInvalid({
          casePostRequest: {
            customFields,
          } as unknown as CasePostRequest,
          casesClient,
        })
      ).resolves.not.toThrow();
    });

    it('does not throw if no custom fields are in request', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
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

      await expect(
        throwIfCustomFieldKeysInvalid({
          casePostRequest: {} as unknown as CasePostRequest,
          casesClient,
        })
      ).resolves.not.toThrow();
    });

    it('does not throw if no configuration found but no custom fields are in request', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([]);

      await expect(
        throwIfCustomFieldKeysInvalid({
          casePostRequest: {} as unknown as CasePostRequest,
          casesClient,
        })
      ).resolves.not.toThrow();
    });

    it('throws if the request has invalid custom field keys', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
          ],
        },
      ]);

      await expect(
        throwIfCustomFieldKeysInvalid({
          casePostRequest: {
            customFields: [
              {
                key: 'invalid_key',
                type: CustomFieldTypes.TOGGLE,
                label: 'foo',
                required: false,
              },
            ],
          } as unknown as CasePostRequest,
          casesClient,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Invalid custom field keys: invalid_key"`);
    });

    it('throws if no configuration found when trying to create custom fields', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([]);

      await expect(
        throwIfCustomFieldKeysInvalid({
          casePostRequest: {
            customFields: [
              {
                key: 'invalid_key',
                type: CustomFieldTypes.TOGGLE,
                label: 'foo',
                required: false,
              },
            ],
          } as unknown as CasePostRequest,
          casesClient,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"No custom fields configured."`);
    });
  });

  describe('throwIfMissingRequiredCustomField', () => {
    const casesClient = createCasesClientMock();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('does not throw if all required custom fields are in the request', async () => {
      const customFields = [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT as const,
          field: { value: ['this is a text field value', 'this is second'] },
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE as const,
          field: { value: null },
        },
      ];

      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
            },
          ],
        },
      ]);

      await expect(
        throwIfMissingRequiredCustomField({
          casePostRequest: {
            customFields,
          } as unknown as CasePostRequest,
          casesClient,
        })
      ).resolves.not.toThrow();
    });

    it('does not throw if no custom fields are in request', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
          ],
        },
      ]);

      await expect(
        throwIfMissingRequiredCustomField({
          casePostRequest: {} as unknown as CasePostRequest,
          casesClient,
        })
      ).resolves.not.toThrow();
    });

    it('does not throw if no configuration found', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([]);

      await expect(
        throwIfMissingRequiredCustomField({
          casePostRequest: {} as unknown as CasePostRequest,
          casesClient,
        })
      ).resolves.not.toThrow();
    });

    it('throws if the request has missing required custom fields', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: mockCases[0].attributes.owner,
          customFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: true,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: true,
            },
          ],
        },
      ]);

      await expect(
        throwIfMissingRequiredCustomField({
          casePostRequest: {
            customFields: [
              {
                key: 'second_key',
                type: CustomFieldTypes.TOGGLE,
                label: 'foo',
              },
            ],
          } as unknown as CasePostRequest,
          casesClient,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Missing required custom fields: first_key"`);
    });
  });
});
