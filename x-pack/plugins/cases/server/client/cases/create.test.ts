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
import { createCasesClientMockArgs } from '../mocks';
import { create } from './create';
import {
  CaseSeverity,
  CaseStatuses,
  ConnectorTypes,
  CustomFieldTypes,
} from '../../../common/types/domain';

import type { CaseCustomFields } from '../../../common/types/domain';
import { omit } from 'lodash';

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

    it('should throw an error if the assignees array length is too long', async () => {
      const assignees = Array(MAX_ASSIGNEES_PER_CASE + 1).fill({ uid: 'foo' });

      await expect(create({ ...theCase, assignees }, clientArgs)).rejects.toThrow(
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
        create({ ...theCase, foo: 'bar' }, clientArgs)
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
        create({ ...theCase, title: 'This is a test case!!' }, clientArgs)
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
          clientArgs
        )
      ).rejects.toThrow(
        `Failed to create case: Error: The length of the title is too long. The maximum length is ${MAX_TITLE_LENGTH}.`
      );
    });

    it('should throw an error if the title is an empty string', async () => {
      await expect(create({ ...theCase, title: '' }, clientArgs)).rejects.toThrow(
        'Failed to create case: Error: The title field cannot be an empty string.'
      );
    });

    it('should throw an error if the title is a string with empty characters', async () => {
      await expect(create({ ...theCase, title: '   ' }, clientArgs)).rejects.toThrow(
        'Failed to create case: Error: The title field cannot be an empty string.'
      );
    });

    it('should trim title', async () => {
      await create({ ...theCase, title: 'title with spaces      ' }, clientArgs);

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
        create({ ...theCase, description: 'This is a test description!!' }, clientArgs)
      ).resolves.not.toThrow();
    });

    it('should throw an error if the description length is too long', async () => {
      const description = Array(MAX_DESCRIPTION_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(create({ ...theCase, description }, clientArgs)).rejects.toThrow(
        `Failed to create case: Error: The length of the description is too long. The maximum length is ${MAX_DESCRIPTION_LENGTH}.`
      );
    });

    it('should throw an error if the description is an empty string', async () => {
      await expect(create({ ...theCase, description: '' }, clientArgs)).rejects.toThrow(
        'Failed to create case: Error: The description field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(create({ ...theCase, description: '   ' }, clientArgs)).rejects.toThrow(
        'Failed to create case: Error: The description field cannot be an empty string.'
      );
    });

    it('should trim description', async () => {
      await create(
        { ...theCase, description: 'this is a description with spaces!!      ' },
        clientArgs
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
      await expect(create({ ...theCase, tags: [] }, clientArgs)).resolves.not.toThrow();
    });

    it('should not throw an error if the tags array has non empty string within limit', async () => {
      await expect(create({ ...theCase, tags: ['abc'] }, clientArgs)).resolves.not.toThrow();
    });

    it('should throw an error if the tags array length is too long', async () => {
      const tags = Array(MAX_TAGS_PER_CASE + 1).fill('foo');

      await expect(create({ ...theCase, tags }, clientArgs)).rejects.toThrow(
        `Failed to create case: Error: The length of the field tags is too long. Array must be of length <= ${MAX_TAGS_PER_CASE}.`
      );
    });

    it('should throw an error if the tags array has empty string', async () => {
      await expect(create({ ...theCase, tags: [''] }, clientArgs)).rejects.toThrow(
        'Failed to create case: Error: The tag field cannot be an empty string.'
      );
    });

    it('should throw an error if the tags array has string with empty characters', async () => {
      await expect(create({ ...theCase, tags: ['  '] }, clientArgs)).rejects.toThrow(
        'Failed to create case: Error: The tag field cannot be an empty string.'
      );
    });

    it('should throw an error if the tag length is too long', async () => {
      const tag = Array(MAX_LENGTH_PER_TAG + 1)
        .fill('f')
        .toString();

      await expect(create({ ...theCase, tags: [tag] }, clientArgs)).rejects.toThrow(
        `Failed to create case: Error: The length of the tag is too long. The maximum length is ${MAX_LENGTH_PER_TAG}.`
      );
    });

    it('should trim tags', async () => {
      await create({ ...theCase, tags: ['pepsi     ', 'coke'] }, clientArgs);

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
      await expect(create({ ...theCase, category: null }, clientArgs)).resolves.not.toThrow();
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
        'Failed to create case: Error: The category field cannot be an empty string.,Invalid value "" supplied to "category"'
      );
    });

    it('should throw an error if the category is a string with empty characters', async () => {
      await expect(create({ ...theCase, category: '   ' }, clientArgs)).rejects.toThrow(
        'Failed to create case: Error: The category field cannot be an empty string.,Invalid value "   " supplied to "category"'
      );
    });

    it('should trim category', async () => {
      await create({ ...theCase, category: 'reporting       ' }, clientArgs);

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

    const theCustomFields: CaseCustomFields = [
      {
        key: 'first_customField_key',
        type: CustomFieldTypes.TEXT,
        field: { value: ['this is a text field value', 'this is second'] },
      },
      {
        key: 'second_customField_key',
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
          clientArgs
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
      await expect(create({ ...theCase }, clientArgs)).resolves.not.toThrow();

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
          clientArgs
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
          clientArgs
        )
      ).rejects.toThrow('Error: Invalid duplicated custom field keys in request: duplicated_key');
    });
  });

  describe('User actions', () => {
    const caseWithOnlyRequiredFields = omit(theCase, [
      'assignees',
      'category',
      'severity',
      'customFields',
    ]) as CasePostRequest;

    const caseWithOptionalFields: CasePostRequest = {
      ...theCase,
      category: 'My category',
      severity: CaseSeverity.CRITICAL,
      customFields: [
        {
          key: 'first_customField_key',
          type: CustomFieldTypes.TEXT,
          field: { value: ['this is a text field value', 'this is second'] },
        },
        {
          key: 'second_customField_key',
          type: CustomFieldTypes.TOGGLE,
          field: { value: [true] },
        },
      ],
    };

    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.postNewCase.mockResolvedValue(caseSO);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create a user action with defaults correctly', async () => {
      await create(caseWithOnlyRequiredFields, clientArgs);

      expect(clientArgs.services.userActionService.creator.createUserAction).toHaveBeenCalledWith({
        caseId: 'mock-id-1',
        owner: 'securitySolution',
        payload: {
          assignees: [],
          category: null,
          connector: { fields: null, id: '.none', name: 'None', type: '.none' },
          customFields: [],
          description: 'testing sir',
          owner: 'securitySolution',
          settings: { syncAlerts: true },
          severity: 'low',
          tags: [],
          title: 'My Case',
        },
        type: 'create_case',
        user: {
          email: 'damaged_raccoon@elastic.co',
          full_name: 'Damaged Raccoon',
          profile_uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
          username: 'damaged_raccoon',
        },
      });
    });

    it('should create a user action with optional fields set correctly', async () => {
      await create(caseWithOptionalFields, clientArgs);

      expect(clientArgs.services.userActionService.creator.createUserAction).toHaveBeenCalledWith({
        caseId: 'mock-id-1',
        owner: 'securitySolution',
        payload: {
          assignees: [{ uid: '1' }],
          category: 'My category',
          connector: { fields: null, id: '.none', name: 'None', type: '.none' },
          customFields: caseWithOptionalFields.customFields,
          description: 'testing sir',
          owner: 'securitySolution',
          settings: { syncAlerts: true },
          severity: 'critical',
          tags: [],
          title: 'My Case',
        },
        type: 'create_case',
        user: {
          email: 'damaged_raccoon@elastic.co',
          full_name: 'Damaged Raccoon',
          profile_uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
          username: 'damaged_raccoon',
        },
      });
    });
  });
});
