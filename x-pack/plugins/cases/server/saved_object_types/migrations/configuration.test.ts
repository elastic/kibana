/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectSanitizedDoc } from 'kibana/server';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { ConnectorTypes } from '../../../common/api';
import { CASE_CONFIGURE_SAVED_OBJECT, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { CONNECTOR_ID_REFERENCE_NAME } from '../../common/constants';
import { getNoneCaseConnector } from '../../common/utils';
import { ESCaseConnectorWithId } from '../../services/test_utils';
import { ESCasesConfigureAttributes } from '../../services/configure/types';
import { configureConnectorIdMigration } from './configuration';

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

describe('configuration migrations', () => {
  describe('7.15.0 connector ID migration', () => {
    it('does not create a reference when the connector ID is none', () => {
      const configureSavedObject = create_7_14_0_configSchema(getNoneCaseConnector());

      const migratedConnector = configureConnectorIdMigration(
        configureSavedObject
      ) as SavedObjectSanitizedDoc<ESCasesConfigureAttributes>;

      expect(migratedConnector.references.length).toBe(0);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
    });

    it('does not create a reference when the connector is undefined and defaults it to the none connector', () => {
      const configureSavedObject = create_7_14_0_configSchema();

      const migratedConnector = configureConnectorIdMigration(
        configureSavedObject
      ) as SavedObjectSanitizedDoc<ESCasesConfigureAttributes>;

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
      ) as SavedObjectSanitizedDoc<ESCasesConfigureAttributes>;

      expect(migratedConnector.references).toEqual([
        { id: '123', type: ACTION_SAVED_OBJECT_TYPE, name: CONNECTOR_ID_REFERENCE_NAME },
      ]);
      expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
    });

    it('returns the other attributes and default connector when the connector is undefined', () => {
      const configureSavedObject = create_7_14_0_configSchema();

      const migratedConnector = configureConnectorIdMigration(
        configureSavedObject
      ) as SavedObjectSanitizedDoc<ESCasesConfigureAttributes>;

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
