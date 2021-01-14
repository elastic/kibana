/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorTypes, CaseStatuses, CaseType, CaseClientPostRequest } from '../../../common/api';

import {
  createMockSavedObjectsRepository,
  mockCaseConfigure,
  mockCases,
} from '../../routes/api/__fixtures__';
import { createCaseClientWithMockSavedObjectsClient } from '../mocks';

describe('create', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2019-11-25T21:54:48.952Z'),
    }));
  });

  describe('happy path', () => {
    test('it creates the case correctly', async () => {
      const postCase: CaseClientPostRequest = {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        tags: ['defacement'],
        type: CaseType.individual,
        connector: {
          id: '123',
          name: 'Jira',
          type: ConnectorTypes.jira,
          fields: { issueType: 'Task', priority: 'High', parent: null },
        },
        settings: {
          syncAlerts: true,
        },
      };

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseConfigureSavedObject: mockCaseConfigure,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await caseClient.client.create({ theCase: postCase });

      expect(res).toEqual({
        id: 'mock-it',
        comments: [],
        totalComment: 0,
        closed_at: null,
        closed_by: null,
        connector: {
          id: '123',
          name: 'Jira',
          type: ConnectorTypes.jira,
          fields: { issueType: 'Task', priority: 'High', parent: null },
        },
        created_at: '2019-11-25T21:54:48.952Z',
        created_by: { full_name: 'Awesome D00d', email: 'd00d@awesome.com', username: 'awesome' },
        description: 'This is a brand new case of a bad meanie defacing data',
        external_service: null,
        title: 'Super Bad Security Issue',
        status: CaseStatuses.open,
        tags: ['defacement'],
        type: CaseType.individual,
        updated_at: null,
        updated_by: null,
        version: 'WzksMV0=',
        settings: {
          syncAlerts: true,
        },
      });

      expect(
        caseClient.services.userActionService.postUserActions.mock.calls[0][0].actions
        // using a snapshot here so we don't have to update the text field manually each time it changes
      ).toMatchSnapshot();
    });

    test('it creates the case without connector in the configuration', async () => {
      const postCase: CaseClientPostRequest = {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        tags: ['defacement'],
        type: CaseType.individual,
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
        settings: {
          syncAlerts: true,
        },
      };

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await caseClient.client.create({ theCase: postCase });

      expect(res).toEqual({
        id: 'mock-it',
        comments: [],
        totalComment: 0,
        closed_at: null,
        closed_by: null,
        connector: { id: 'none', name: 'none', type: ConnectorTypes.none, fields: null },
        created_at: '2019-11-25T21:54:48.952Z',
        created_by: { full_name: 'Awesome D00d', email: 'd00d@awesome.com', username: 'awesome' },
        description: 'This is a brand new case of a bad meanie defacing data',
        external_service: null,
        title: 'Super Bad Security Issue',
        status: CaseStatuses.open,
        tags: ['defacement'],
        type: CaseType.individual,
        updated_at: null,
        updated_by: null,
        version: 'WzksMV0=',
        settings: {
          syncAlerts: true,
        },
      });
    });

    test('Allow user to create case without authentication', async () => {
      const postCase: CaseClientPostRequest = {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        tags: ['defacement'],
        type: CaseType.individual,
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
        settings: {
          syncAlerts: true,
        },
      };

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({
        savedObjectsClient,
        badAuth: true,
      });
      const res = await caseClient.client.create({ theCase: postCase });

      expect(res).toEqual({
        id: 'mock-it',
        comments: [],
        totalComment: 0,
        closed_at: null,
        closed_by: null,
        connector: { id: 'none', name: 'none', type: ConnectorTypes.none, fields: null },
        created_at: '2019-11-25T21:54:48.952Z',
        created_by: {
          email: null,
          full_name: null,
          username: null,
        },
        description: 'This is a brand new case of a bad meanie defacing data',
        external_service: null,
        title: 'Super Bad Security Issue',
        status: CaseStatuses.open,
        tags: ['defacement'],
        type: CaseType.individual,
        updated_at: null,
        updated_by: null,
        version: 'WzksMV0=',
        settings: {
          syncAlerts: true,
        },
      });
    });
  });

  describe('unhappy path', () => {
    test('it throws when missing title', async () => {
      expect.assertions(3);
      const postCase = {
        description: 'This is a brand new case of a bad meanie defacing data',
        tags: ['defacement'],
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
      };

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      caseClient.client
        // @ts-expect-error
        .create({ theCase: postCase })
        .catch((e) => {
          expect(e).not.toBeNull();
          expect(e.isBoom).toBe(true);
          expect(e.output.statusCode).toBe(400);
        });
    });

    test('it throws when missing description', async () => {
      expect.assertions(3);
      const postCase = {
        title: 'a title',
        tags: ['defacement'],
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
      };

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      caseClient.client
        // @ts-expect-error
        .create({ theCase: postCase })
        .catch((e) => {
          expect(e).not.toBeNull();
          expect(e.isBoom).toBe(true);
          expect(e.output.statusCode).toBe(400);
        });
    });

    test('it throws when missing tags', async () => {
      expect.assertions(3);
      const postCase = {
        title: 'a title',
        description: 'This is a brand new case of a bad meanie defacing data',
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
      };

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      caseClient.client
        // @ts-expect-error
        .create({ theCase: postCase })
        .catch((e) => {
          expect(e).not.toBeNull();
          expect(e.isBoom).toBe(true);
          expect(e.output.statusCode).toBe(400);
        });
    });

    test('it throws when missing connector ', async () => {
      expect.assertions(3);
      const postCase = {
        title: 'a title',
        description: 'This is a brand new case of a bad meanie defacing data',
        tags: ['defacement'],
      };

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      caseClient.client
        // @ts-expect-error
        .create({ theCase: postCase })
        .catch((e) => {
          expect(e).not.toBeNull();
          expect(e.isBoom).toBe(true);
          expect(e.output.statusCode).toBe(400);
        });
    });

    test('it throws when connector missing the right fields', async () => {
      expect.assertions(3);
      const postCase = {
        title: 'a title',
        description: 'This is a brand new case of a bad meanie defacing data',
        tags: ['defacement'],
        connector: {
          id: '123',
          name: 'Jira',
          type: ConnectorTypes.jira,
          fields: {},
        },
      };

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      caseClient.client
        // @ts-expect-error
        .create({ theCase: postCase })
        .catch((e) => {
          expect(e).not.toBeNull();
          expect(e.isBoom).toBe(true);
          expect(e.output.statusCode).toBe(400);
        });
    });

    test('it throws if you passing status for a new case', async () => {
      expect.assertions(3);
      const postCase = {
        title: 'a title',
        description: 'This is a brand new case of a bad meanie defacing data',
        tags: ['defacement'],
        type: CaseType.individual,
        status: CaseStatuses.closed,
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
        settings: {
          syncAlerts: true,
        },
      };

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      caseClient.client.create({ theCase: postCase }).catch((e) => {
        expect(e).not.toBeNull();
        expect(e.isBoom).toBe(true);
        expect(e.output.statusCode).toBe(400);
      });
    });

    it(`Returns an error if postNewCase throws`, async () => {
      const postCase: CaseClientPostRequest = {
        description: 'Throw an error',
        title: 'Super Bad Security Issue',
        tags: ['error'],
        type: CaseType.individual,
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
        settings: {
          syncAlerts: true,
        },
      };
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });

      caseClient.client.create({ theCase: postCase }).catch((e) => {
        expect(e).not.toBeNull();
        expect(e.isBoom).toBe(true);
        expect(e.output.statusCode).toBe(400);
      });
    });
  });
});
