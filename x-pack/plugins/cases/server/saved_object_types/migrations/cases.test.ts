/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectSanitizedDoc } from '@kbn/core/server';
import {
  CaseAttributes,
  CaseFullExternalService,
  ConnectorTypes,
  NONE_CONNECTOR_ID,
} from '../../../common/api';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { getNoneCaseConnector } from '../../common/utils';
import { createExternalService, ESCaseConnectorWithId } from '../../services/test_utils';
import { caseConnectorIdMigration, removeCaseType } from './cases';

// eslint-disable-next-line @typescript-eslint/naming-convention
const create_7_14_0_case = ({
  connector,
  externalService,
}: { connector?: ESCaseConnectorWithId; externalService?: CaseFullExternalService } = {}) => ({
  type: CASE_SAVED_OBJECT,
  id: '1',
  attributes: {
    connector,
    external_service: externalService,
  },
});

describe('case migrations', () => {
  describe('7.15.0 connector ID migration', () => {
    it('does not create a reference when the connector.id is none', () => {
      const caseSavedObject = create_7_14_0_case({ connector: getNoneCaseConnector() });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      expect(migratedConnector.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it('does not create a reference when the connector is undefined', () => {
      const caseSavedObject = create_7_14_0_case();

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      expect(migratedConnector.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it('sets the connector to the default none connector if the connector.id is undefined', () => {
      const caseSavedObject = create_7_14_0_case({
        connector: {
          fields: null,
          name: ConnectorTypes.jira,
          type: ConnectorTypes.jira,
        } as ESCaseConnectorWithId,
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      expect(migratedConnector.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it('does not create a reference when the external_service is null', () => {
      const caseSavedObject = create_7_14_0_case({ externalService: null });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.external_service).toBeNull();
    });

    it('does not create a reference when the external_service is undefined and sets external_service to null', () => {
      const caseSavedObject = create_7_14_0_case();

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.external_service).toBeNull();
    });

    it('does not create a reference when the external_service.connector_id is none', () => {
      const caseSavedObject = create_7_14_0_case({
        externalService: createExternalService({ connector_id: NONE_CONNECTOR_ID }),
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.external_service).toMatchInlineSnapshot(`
        Object {
          "connector_name": ".jira",
          "external_id": "100",
          "external_title": "awesome",
          "external_url": "http://www.google.com",
          "pushed_at": "2019-11-25T21:54:48.952Z",
          "pushed_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
        }
      `);
    });

    it('preserves the existing references when migrating', () => {
      const caseSavedObject = {
        ...create_7_14_0_case(),
        references: [{ id: '1', name: 'awesome', type: 'hello' }],
      };

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(1);
      expect(migratedConnector.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "1",
            "name": "awesome",
            "type": "hello",
          },
        ]
      `);
    });

    it('creates a connector reference and removes the connector.id field', () => {
      const caseSavedObject = create_7_14_0_case({
        connector: {
          id: '123',
          fields: null,
          name: 'connector',
          type: ConnectorTypes.jira,
        },
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(1);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      expect(migratedConnector.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "name": "connector",
          "type": ".jira",
        }
      `);
      expect(migratedConnector.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "123",
            "name": "connectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('creates a push connector reference and removes the connector_id field', () => {
      const caseSavedObject = create_7_14_0_case({
        externalService: {
          connector_id: '100',
          connector_name: '.jira',
          external_id: '100',
          external_title: 'awesome',
          external_url: 'http://www.google.com',
          pushed_at: '2019-11-25T21:54:48.952Z',
          pushed_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
        },
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(1);
      expect(migratedConnector.attributes.external_service).not.toHaveProperty('connector_id');
      expect(migratedConnector.attributes.external_service).toMatchInlineSnapshot(`
        Object {
          "connector_name": ".jira",
          "external_id": "100",
          "external_title": "awesome",
          "external_url": "http://www.google.com",
          "pushed_at": "2019-11-25T21:54:48.952Z",
          "pushed_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
        }
      `);
      expect(migratedConnector.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "100",
            "name": "pushConnectorId",
            "type": "action",
          },
        ]
      `);
    });

    it('does not create a reference and preserves the existing external_service fields when connector_id is null', () => {
      const caseSavedObject = create_7_14_0_case({
        externalService: {
          connector_id: 'none',
          connector_name: '.jira',
          external_id: '100',
          external_title: 'awesome',
          external_url: 'http://www.google.com',
          pushed_at: '2019-11-25T21:54:48.952Z',
          pushed_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
        },
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.external_service).not.toHaveProperty('connector_id');
      expect(migratedConnector.attributes.external_service).toMatchInlineSnapshot(`
        Object {
          "connector_name": ".jira",
          "external_id": "100",
          "external_title": "awesome",
          "external_url": "http://www.google.com",
          "pushed_at": "2019-11-25T21:54:48.952Z",
          "pushed_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
        }
      `);
    });

    it('migrates both connector and external_service when provided', () => {
      const caseSavedObject = create_7_14_0_case({
        externalService: {
          connector_id: '100',
          connector_name: '.jira',
          external_id: '100',
          external_title: 'awesome',
          external_url: 'http://www.google.com',
          pushed_at: '2019-11-25T21:54:48.952Z',
          pushed_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
        },
        connector: {
          id: '123',
          fields: null,
          name: 'connector',
          type: ConnectorTypes.jira,
        },
      });

      const migratedConnector = caseConnectorIdMigration(
        caseSavedObject
      ) as SavedObjectSanitizedDoc<CaseAttributes>;

      expect(migratedConnector.references.length).toBe(2);
      expect(migratedConnector.attributes.external_service).not.toHaveProperty('connector_id');
      expect(migratedConnector.attributes.external_service).toMatchInlineSnapshot(`
        Object {
          "connector_name": ".jira",
          "external_id": "100",
          "external_title": "awesome",
          "external_url": "http://www.google.com",
          "pushed_at": "2019-11-25T21:54:48.952Z",
          "pushed_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
        }
      `);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      expect(migratedConnector.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "name": "connector",
          "type": ".jira",
        }
      `);
      expect(migratedConnector.references).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "123",
            "name": "connectorId",
            "type": "action",
          },
          Object {
            "id": "100",
            "name": "pushConnectorId",
            "type": "action",
          },
        ]
      `);
    });
  });

  describe('removeCaseType', () => {
    it('removes the type field from the document', () => {
      const doc = {
        id: '123',
        attributes: {
          type: 'individual',
          title: 'case',
        },
        type: 'abc',
        references: [],
      };

      expect(removeCaseType(doc)).toEqual({
        ...doc,
        attributes: {
          title: doc.attributes.title,
        },
      });
    });
  });
});
