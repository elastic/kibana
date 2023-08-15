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
} from '../../../common/constants';
import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { create } from './create';
import { CaseSeverity, CaseStatuses, ConnectorTypes } from '../../../common/types/domain';

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
          },
          id: expect.any(String),
          refresh: false,
        })
      );
    });
  });
});
