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

    it('should not have foo:bar attribute in request payload of createUserAction', async () => {
      // @ts-expect-error
      await create({ ...theCase, foo: 'bar' }, clientArgs);

      expect(clientArgs.services.userActionService.creator.createUserAction).toBeCalledTimes(1);
      expect(clientArgs.services.userActionService.creator.createUserAction.mock.calls[0][0])
        .toMatchInlineSnapshot(`
        Object {
          "caseId": "mock-id-1",
          "owner": "securitySolution",
          "payload": Object {
            "assignees": Array [
              Object {
                "uid": "1",
              },
            ],
            "connector": Object {
              "fields": null,
              "id": ".none",
              "name": "None",
              "type": ".none",
            },
            "description": "testing sir",
            "owner": "securitySolution",
            "settings": Object {
              "syncAlerts": true,
            },
            "severity": "low",
            "tags": Array [],
            "title": "My Case",
          },
          "type": "create_case",
          "user": Object {
            "email": "damaged_raccoon@elastic.co",
            "full_name": "Damaged Raccoon",
            "profile_uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
            "username": "damaged_raccoon",
          },
        }
      `);
    });

    it('should not have foo:bar attribute in request payload of notifyAssignees', async () => {
      // @ts-expect-error
      await create({ ...theCase, foo: 'bar' }, clientArgs);

      expect(clientArgs.services.notificationService.notifyAssignees).toBeCalledTimes(1);
      expect(clientArgs.services.notificationService.notifyAssignees.mock.calls[0][0])
        .toMatchInlineSnapshot(`
        Object {
          "assignees": Array [
            Object {
              "uid": "1",
            },
          ],
          "theCase": Object {
            "attributes": Object {
              "assignees": Array [],
              "closed_at": null,
              "closed_by": null,
              "connector": Object {
                "fields": null,
                "id": "none",
                "name": "none",
                "type": ".none",
              },
              "created_at": "2019-11-25T21:54:48.952Z",
              "created_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "description": "This is a brand new case of a bad meanie defacing data",
              "duration": null,
              "external_service": null,
              "owner": "securitySolution",
              "settings": Object {
                "syncAlerts": true,
              },
              "severity": "low",
              "status": "open",
              "tags": Array [
                "defacement",
              ],
              "title": "Super Bad Security Issue",
              "updated_at": "2019-11-25T21:54:48.952Z",
              "updated_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
            },
            "id": "mock-id-1",
            "references": Array [],
            "type": "cases",
            "updated_at": "2019-11-25T21:54:48.952Z",
            "version": "WzAsMV0=",
          },
        }
      `);
    });
  });
});
