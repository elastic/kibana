/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResponse } from 'kibana/server';
import {
  CaseConnector,
  CaseType,
  ConnectorTypes,
  ESCaseConnector,
  ESCasesConfigureAttributes,
} from '../../common/api';
import { mockCaseConfigure } from '../routes/api/__fixtures__';
import { newCase } from '../routes/api/__mocks__/request_responses';
import {
  transformCaseConnectorToEsConnector,
  transformESConnectorToCaseConnector,
  transformNewCase,
} from '../common';
import { getConnectorFromConfiguration, sortToSnake } from './utils';

describe('utils', () => {
  const caseConnector: CaseConnector = {
    id: '123',
    name: 'Jira',
    type: ConnectorTypes.jira,
    fields: { issueType: 'Task', priority: 'High', parent: null },
  };

  const esCaseConnector: ESCaseConnector = {
    id: '123',
    name: 'Jira',
    type: ConnectorTypes.jira,
    fields: [
      { key: 'issueType', value: 'Task' },
      { key: 'priority', value: 'High' },
      { key: 'parent', value: null },
    ],
  };

  const caseConfigure: SavedObjectsFindResponse<ESCasesConfigureAttributes> = {
    saved_objects: [{ ...mockCaseConfigure[0], score: 0 }],
    total: 1,
    per_page: 20,
    page: 1,
  };

  describe('transformCaseConnectorToEsConnector', () => {
    it('transform correctly', () => {
      expect(transformCaseConnectorToEsConnector(caseConnector)).toEqual(esCaseConnector);
    });

    it('transform correctly with null attributes', () => {
      // @ts-ignore this is case the connector does not exist for old cases object or configurations
      expect(transformCaseConnectorToEsConnector(null)).toEqual({
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
        fields: [],
      });
    });
  });

  describe('transformESConnectorToCaseConnector', () => {
    it('transform correctly', () => {
      expect(transformESConnectorToCaseConnector(esCaseConnector)).toEqual(caseConnector);
    });

    it('transform correctly with null attributes', () => {
      // @ts-ignore this is case the connector does not exist for old cases object or configurations
      expect(transformESConnectorToCaseConnector(null)).toEqual({
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
        fields: null,
      });
    });
  });

  describe('getConnectorFromConfiguration', () => {
    it('transform correctly', () => {
      expect(getConnectorFromConfiguration(caseConfigure)).toEqual({
        id: '789',
        name: 'My connector 3',
        type: ConnectorTypes.jira,
        fields: null,
      });
    });

    it('transform correctly with no connector', () => {
      const caseConfigureNoConnector: SavedObjectsFindResponse<ESCasesConfigureAttributes> = {
        ...caseConfigure,
        saved_objects: [
          {
            ...mockCaseConfigure[0],
            // @ts-ignore this is case the connector does not exist for old cases object or configurations
            attributes: { ...mockCaseConfigure[0].attributes, connector: null },
            score: 0,
          },
        ],
      };

      expect(getConnectorFromConfiguration(caseConfigureNoConnector)).toEqual({
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
        fields: null,
      });
    });
  });

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
    const connector: ESCaseConnector = {
      id: '123',
      name: 'My connector',
      type: ConnectorTypes.jira,
      fields: [
        { key: 'issueType', value: 'Task' },
        { key: 'priority', value: 'High' },
        { key: 'parent', value: null },
      ],
    };
    it('transform correctly', () => {
      const myCase = {
        newCase: { ...newCase, type: CaseType.individual },
        connector,
        createdDate: '2020-04-09T09:43:51.778Z',
        email: 'elastic@elastic.co',
        full_name: 'Elastic',
        username: 'elastic',
      };

      const res = transformNewCase(myCase);

      expect(res).toMatchInlineSnapshot(`
        Object {
          "closed_at": null,
          "closed_by": null,
          "connector": Object {
            "fields": Array [
              Object {
                "key": "issueType",
                "value": "Task",
              },
              Object {
                "key": "priority",
                "value": "High",
              },
              Object {
                "key": "parent",
                "value": null,
              },
            ],
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
          "type": "individual",
          "updated_at": null,
          "updated_by": null,
        }
      `);
    });

    it('transform correctly without optional fields', () => {
      const myCase = {
        newCase: { ...newCase, type: CaseType.individual },
        connector,
        createdDate: '2020-04-09T09:43:51.778Z',
      };

      const res = transformNewCase(myCase);

      expect(res).toMatchInlineSnapshot(`
        Object {
          "closed_at": null,
          "closed_by": null,
          "connector": Object {
            "fields": Array [
              Object {
                "key": "issueType",
                "value": "Task",
              },
              Object {
                "key": "priority",
                "value": "High",
              },
              Object {
                "key": "parent",
                "value": null,
              },
            ],
            "id": "123",
            "name": "My connector",
            "type": ".jira",
          },
          "created_at": "2020-04-09T09:43:51.778Z",
          "created_by": Object {
            "email": undefined,
            "full_name": undefined,
            "username": undefined,
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
          "type": "individual",
          "updated_at": null,
          "updated_by": null,
        }
      `);
    });

    it('transform correctly with optional fields as null', () => {
      const myCase = {
        newCase: { ...newCase, type: CaseType.individual },
        connector,
        createdDate: '2020-04-09T09:43:51.778Z',
        email: null,
        full_name: null,
        username: null,
      };

      const res = transformNewCase(myCase);

      expect(res).toMatchInlineSnapshot(`
        Object {
          "closed_at": null,
          "closed_by": null,
          "connector": Object {
            "fields": Array [
              Object {
                "key": "issueType",
                "value": "Task",
              },
              Object {
                "key": "priority",
                "value": "High",
              },
              Object {
                "key": "parent",
                "value": null,
              },
            ],
            "id": "123",
            "name": "My connector",
            "type": ".jira",
          },
          "created_at": "2020-04-09T09:43:51.778Z",
          "created_by": Object {
            "email": null,
            "full_name": null,
            "username": null,
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
          "type": "individual",
          "updated_at": null,
          "updated_by": null,
        }
      `);
    });
  });
});
