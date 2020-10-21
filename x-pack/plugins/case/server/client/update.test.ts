/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import {
  createCaseServiceMock,
  createConfigureServiceMock,
  createUserActionServiceMock,
} from '../services/__mocks__';
import { mockCases } from '../routes/api/__fixtures__';

import { update } from './update';
import { CaseClient } from './types';
import {
  elasticUser,
  patchConnector,
  patchCases,
  caseConfigureResponse,
  getCasesResponse,
} from './__mocks__';

const caseService = createCaseServiceMock();
const caseConfigureService = createConfigureServiceMock();
const userActionService = createUserActionServiceMock();
const savedObjectsClient = savedObjectsClientMock.create();
const request = {} as KibanaRequest;

describe('update()', () => {
  let updateHandler: CaseClient['update'];
  beforeEach(() => {
    jest.resetAllMocks();
    const { id, version, ...patchCaseAttributes } = patchCases.cases[0];
    caseService.getUser.mockResolvedValue(elasticUser);
    caseService.getCases.mockResolvedValue(getCasesResponse);
    caseService.patchCases.mockResolvedValue({
      saved_objects: [
        {
          ...mockCases[0],
          version: 'WzAsMV1=',
          attributes: { ...mockCases[0].attributes, ...patchCaseAttributes },
        },
      ],
    });
    caseConfigureService.find.mockResolvedValue(caseConfigureResponse);

    updateHandler = update({
      savedObjectsClient,
      caseService,
      caseConfigureService,
      userActionService,
    });
  });

  describe('happy path', () => {
    test('it updates the case correctly', async () => {
      const res = await updateHandler({ request, cases: patchCases });
      expect(res).toEqual([
        {
          id: 'mock-id-1',
          comments: [],
          totalComment: 0,
          closed_at: null,
          closed_by: null,
          connector: { id: 'none', name: 'none', type: '.none', fields: null },
          created_at: '2019-11-25T21:54:48.952Z',
          created_by: { full_name: 'elastic', email: 'testemail@elastic.co', username: 'elastic' },
          description: 'Description updated',
          external_service: null,
          title: 'Title updated',
          status: 'open',
          tags: ['defacement'],
          updated_at: '2019-11-25T21:54:48.952Z',
          updated_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
          version: 'WzAsMV1=',
        },
      ]);
    });

    test('it updates the connector correctly', async () => {
      const {
        id: patchConnectorId,
        version: patchConnectorVersion,
        ...patchConnectorAttributes
      } = patchConnector.cases[0];

      caseService.patchCases.mockResolvedValue({
        saved_objects: [
          {
            ...mockCases[0],
            version: 'WzAsMV1=',
            attributes: { ...mockCases[0].attributes, ...patchConnectorAttributes },
          },
        ],
      });

      const res = await updateHandler({ request, cases: patchConnector });
      expect(res).toEqual([
        {
          id: 'mock-id-1',
          comments: [],
          totalComment: 0,
          closed_at: null,
          closed_by: null,
          connector: { id: 'jira', name: 'jira', type: '.jira', fields: null },
          created_at: '2019-11-25T21:54:48.952Z',
          created_by: { full_name: 'elastic', email: 'testemail@elastic.co', username: 'elastic' },
          description: 'This is a brand new case of a bad meanie defacing data',
          external_service: null,
          title: 'Super Bad Security Issue',
          status: 'open',
          tags: ['defacement'],
          updated_at: '2019-11-25T21:54:48.952Z',
          updated_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
          version: 'WzAsMV1=',
        },
      ]);
    });

    test('it updates the status correctly: closed', async () => {
      const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
      spyOnDate.mockImplementation(() => ({
        toISOString: jest.fn().mockReturnValue('2019-11-25T21:54:48.952Z'),
      }));

      await updateHandler({
        request,
        cases: {
          cases: [
            {
              id: 'mock-id-1',
              version: 'WzAsMV0=',
              status: 'closed',
            },
          ],
        },
      });

      expect(caseService.patchCases.mock.calls[0][0].cases[0].updatedAttributes).toEqual({
        status: 'closed',
        closed_at: '2019-11-25T21:54:48.952Z',
        closed_by: {
          email: 'testemail@elastic.co',
          full_name: 'elastic',
          username: 'elastic',
        },
        updated_at: '2019-11-25T21:54:48.952Z',
        updated_by: {
          email: 'testemail@elastic.co',
          full_name: 'elastic',
          username: 'elastic',
        },
      });
    });

    test('it updates the status correctly: open', async () => {
      const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
      spyOnDate.mockImplementation(() => ({
        toISOString: jest.fn().mockReturnValue('2019-11-25T21:54:48.952Z'),
      }));

      caseService.getCases.mockResolvedValue({
        ...getCasesResponse,
        saved_objects: [
          { ...mockCases[0], attributes: { ...mockCases[0].attributes, status: 'closed' } },
        ],
      });

      await updateHandler({
        request,
        cases: {
          cases: [
            {
              id: 'mock-id-1',
              version: 'WzAsMV0=',
              status: 'open',
            },
          ],
        },
      });

      expect(caseService.patchCases.mock.calls[0][0].cases[0].updatedAttributes).toEqual({
        status: 'open',
        closed_at: null,
        closed_by: null,
        updated_at: '2019-11-25T21:54:48.952Z',
        updated_by: {
          email: 'testemail@elastic.co',
          full_name: 'elastic',
          username: 'elastic',
        },
      });
    });
  });

  describe('unhappy path', () => {
    test('it throws when missing id', async () => {
      expect.assertions(1);
      updateHandler({
        request,
        cases: {
          cases: [
            // @ts-expect-error
            {
              title: 'update',
            },
          ],
        },
      }).catch((e) => expect(e).not.toBeNull());
    });

    test('it throws when missing version', async () => {
      expect.assertions(1);
      updateHandler({
        request,
        cases: {
          cases: [
            // @ts-expect-error
            {
              id: '123',
              title: 'update',
            },
          ],
        },
      }).catch((e) => expect(e).not.toBeNull());
    });

    test('it throws when fields are identical', async () => {
      expect.assertions(1);
      updateHandler({
        request,
        cases: {
          cases: [
            {
              id: 'mock-id-1',
              version: 'WzAsMV0=',
              title: 'Super Bad Security Issue',
            },
          ],
        },
      }).catch((e) =>
        expect(e.message).toBe('All update fields are identical to current version.')
      );
    });

    test('it throws when case does not exist', async () => {
      caseService.getCases.mockResolvedValue({ saved_objects: [{ id: 'not-exists', error: {} }] });
      expect.assertions(1);
      updateHandler({
        request,
        cases: {
          cases: [
            {
              id: 'not-exists',
              version: 'WzAsMV0=',
              title: 'Super Bad Security Issue',
            },
          ],
        },
      }).catch((e) =>
        expect(e.message).toBe(
          'These cases not-exists do not exist. Please check you have the correct ids.'
        )
      );
    });

    test('it throws when cases conflicts', async () => {
      expect.assertions(1);
      updateHandler({
        request,
        cases: {
          cases: [
            {
              id: 'mock-id-1',
              version: 'WzAsMV1=',
              title: 'Super Bad Security Issue',
            },
          ],
        },
      }).catch((e) =>
        expect(e.message).toBe(
          'These cases mock-id-1 has been updated. Please refresh before saving additional updates.'
        )
      );
    });
  });
});
