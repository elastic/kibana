/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseConnector, ConnectorTypes } from '../../common/api';
import { newCase } from '../routes/api/__mocks__/request_responses';
import { transformNewCase } from '../common/utils';
import { sortToSnake } from './utils';

describe('utils', () => {
  describe('sortToSnake', () => {
    it('it transforms status correctly', () => {
      expect(sortToSnake('status')).toBe('status');
    });

    it('it transforms createdAt correctly', () => {
      expect(sortToSnake('createdAt')).toBe('created_at');
    });

    it('it transforms created_at correctly', () => {
      expect(sortToSnake('created_at')).toBe('created_at');
    });

    it('it transforms closedAt correctly', () => {
      expect(sortToSnake('closedAt')).toBe('closed_at');
    });

    it('it transforms closed_at correctly', () => {
      expect(sortToSnake('closed_at')).toBe('closed_at');
    });

    it('it transforms default correctly', () => {
      expect(sortToSnake('not-exist')).toBe('created_at');
    });
  });

  describe('transformNewCase', () => {
    beforeAll(() => {
      jest.useFakeTimers('modern');
      jest.setSystemTime(new Date('2020-04-09T09:43:51.778Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    const connector: CaseConnector = {
      id: '123',
      name: 'My connector',
      type: ConnectorTypes.jira,
      fields: { issueType: 'Task', priority: 'High', parent: null },
    };
    it('transform correctly', () => {
      const myCase = {
        newCase: { ...newCase, connector },
        user: {
          email: 'elastic@elastic.co',
          full_name: 'Elastic',
          username: 'elastic',
        },
      };

      const res = transformNewCase(myCase);

      expect(res).toMatchInlineSnapshot(`
        Object {
          "closed_at": null,
          "closed_by": null,
          "connector": Object {
            "fields": Object {
              "issueType": "Task",
              "parent": null,
              "priority": "High",
            },
            "id": "123",
            "name": "My connector",
            "type": ".jira",
          },
          "created_at": "2020-04-09T09:43:51.778Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic",
            "username": "elastic",
          },
          "description": "A description",
          "external_service": null,
          "owner": "securitySolution",
          "settings": Object {
            "syncAlerts": true,
          },
          "status": "open",
          "tags": Array [
            "new",
            "case",
          ],
          "title": "My new case",
          "updated_at": null,
          "updated_by": null,
        }
      `);
    });
  });
});
