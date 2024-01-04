/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectSanitizedDoc, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import { ConnectorTypes } from '../../../common/types/domain';
import { CASE_CONFIGURE_SAVED_OBJECT, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { CONNECTOR_ID_REFERENCE_NAME } from '../../common/constants';
import { getNoneCaseConnector } from '../../common/utils';
import type { ESCaseConnectorWithId } from '../../services/test_utils';
import type { UnsanitizedConfigureConnector } from './configuration';
import { createConnectorAttributeMigration, configureConnectorIdMigration } from './configuration';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';
import type { ConfigurationAttributes } from '../../../common/types/domain';

// eslint-disable-next-line @typescript-eslint/naming-convention
const create_7_14_0_configSchema = (connector?: ESCaseConnectorWithId) => ({
  type: CASE_CONFIGURE_SAVED_OBJECT,
  id: '1',
  attributes: {
    connector,
    closure_type: 'close-by-pushing',
    owner: SECURITY_SOLUTION_OWNER,
    created_at: '2020-04-09T09:43:51.778Z',
    created_by: {
      full_name: 'elastic',
      email: 'testemail@elastic.co',
      username: 'elastic',
    },
    updated_at: '2020-04-09T09:43:51.778Z',
    updated_by: {
      full_name: 'elastic',
      email: 'testemail@elastic.co',
      username: 'elastic',
    },
  },
});

// eslint-disable-next-line @typescript-eslint/naming-convention
const create_7_9_0_configSchema = (
  overrides?: object
): SavedObjectUnsanitizedDoc<UnsanitizedConfigureConnector> => {
  return {
    attributes: {
      connector_id: 'b35c26a9-4d0d-4ffb-be85-4e9b96266204',
      connector_name: '',
      closure_type: 'close-by-user',
      created_at: '2023-01-31T22:11:49.480Z',
      created_by: {
        email: 'test@test.com',
        full_name: 'tester',
        username: 'tester_user',
      },
      updated_at: null,
      updated_by: null,
      ...overrides,
    },
    id: '1',
    type: 'cases-configure',
    references: [],
    updated_at: '2023-01-31T22:00:50.003Z',
  } as SavedObjectUnsanitizedDoc<UnsanitizedConfigureConnector>;
};

describe('configuration migrations', () => {
  describe('7.10.0 connector migration', () => {
    it('creates the connector field with the connector id and name nested under it', () => {
      const config = createConnectorAttributeMigration(create_7_9_0_configSchema());

      expect(config.attributes.connector.id).toEqual('b35c26a9-4d0d-4ffb-be85-4e9b96266204');
      expect(config.attributes.connector.name).toEqual('');
    });

    it('sets the connector.name field to the existing name', () => {
      const config = createConnectorAttributeMigration(
        create_7_9_0_configSchema({ connector_name: 'connector-name' })
      );

      expect(config.attributes.connector.name).toEqual('connector-name');
    });

    it('sets the connector.fields to null and connector.type to .none', () => {
      const config = createConnectorAttributeMigration(create_7_9_0_configSchema());

      expect(config.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "id": "b35c26a9-4d0d-4ffb-be85-4e9b96266204",
          "name": "",
          "type": ".none",
        }
      `);
    });

    it('does not modify the other attributes of the saved object', () => {
      const config = createConnectorAttributeMigration(create_7_9_0_configSchema());

      const configAttributes = config as SavedObjectSanitizedDoc<ConfigurationAttributes>;
      expect(configAttributes.attributes.created_by.email).toEqual('test@test.com');
    });

    it('sets name and id to none when they are undefined', () => {
      const config = createConnectorAttributeMigration(
        create_7_9_0_configSchema({ connector_name: undefined, connector_id: undefined })
      );

      expect(config.attributes.connector.id).toEqual('none');
      expect(config.attributes.connector.name).toEqual('none');
    });

    it('removes the connector_id and connector_name fields', () => {
      const config = createConnectorAttributeMigration(
        create_7_9_0_configSchema({ connector_name: 'name', connector_id: 'id' })
      );

      expect(config.attributes).not.toHaveProperty('connector_id');
      expect(config.attributes).not.toHaveProperty('connector_name');
    });

    it('sets the references to an empty array when it is initially undefined', () => {
      const docWithoutRefs = { ...create_7_9_0_configSchema(), references: undefined };
      const config = createConnectorAttributeMigration(docWithoutRefs);

      expect(config.references).toEqual([]);
    });
  });

  describe('7.15.0 connector ID migration', () => {
    it('does not create a reference when the connector ID is none', () => {
      const configureSavedObject = create_7_14_0_configSchema(getNoneCaseConnector());

      const migratedConnector = configureConnectorIdMigration(
        configureSavedObject
      ) as SavedObjectSanitizedDoc<ConfigurationPersistedAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
    });

    it('does not create a reference when the connector is undefined and defaults it to the none connector', () => {
      const configureSavedObject = create_7_14_0_configSchema();

      const migratedConnector = configureConnectorIdMigration(
        configureSavedObject
      ) as SavedObjectSanitizedDoc<ConfigurationPersistedAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.connector).toMatchInlineSnapshot(`
        Object {
          "fields": null,
          "name": "none",
          "type": ".none",
        }
      `);
    });

    it('creates a reference using the connector id', () => {
      const configureSavedObject = create_7_14_0_configSchema({
        id: '123',
        fields: null,
        name: 'connector',
        type: ConnectorTypes.jira,
      });

      const migratedConnector = configureConnectorIdMigration(
        configureSavedObject
      ) as SavedObjectSanitizedDoc<ConfigurationPersistedAttributes>;

      expect(migratedConnector.references).toEqual([
        { id: '123', type: ACTION_SAVED_OBJECT_TYPE, name: CONNECTOR_ID_REFERENCE_NAME },
      ]);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
    });

    it('returns the other attributes and default connector when the connector is undefined', () => {
      const configureSavedObject = create_7_14_0_configSchema();

      const migratedConnector = configureConnectorIdMigration(
        configureSavedObject
      ) as SavedObjectSanitizedDoc<ConfigurationPersistedAttributes>;

      expect(migratedConnector).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "closure_type": "close-by-pushing",
            "connector": Object {
              "fields": null,
              "name": "none",
              "type": ".none",
            },
            "created_at": "2020-04-09T09:43:51.778Z",
            "created_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
            "owner": "securitySolution",
            "updated_at": "2020-04-09T09:43:51.778Z",
            "updated_by": Object {
              "email": "testemail@elastic.co",
              "full_name": "elastic",
              "username": "elastic",
            },
          },
          "id": "1",
          "references": Array [],
          "type": "cases-configure",
        }
      `);
    });
  });
});
