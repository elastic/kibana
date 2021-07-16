/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectSanitizedDoc } from 'kibana/server';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../actions/server';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  ConnectorTypes,
  ESCaseConnector,
  SECURITY_SOLUTION_OWNER,
} from '../../common';
import { getNoneCaseConnector } from '../common';
import { connectorIDReferenceName } from '../services';
import { ESCasesConfigureAttributes } from '../services/configure';
import { configureConnectorIdMigration } from './migrations';

const createLegacyConfigSchema = (connector: ESCaseConnector) => ({
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

describe('migrations', () => {
  describe('configure', () => {
    describe('7.15.0 connector ID migration', () => {
      it('does not create a reference when the connector ID is none', () => {
        const configureSavedObject = createLegacyConfigSchema(getNoneCaseConnector());

        const migratedConnector = configureConnectorIdMigration(
          configureSavedObject
        ) as SavedObjectSanitizedDoc<ESCasesConfigureAttributes>;

        expect(migratedConnector.references.length).toBe(0);
        expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      });

      it('creates a reference using the connector id', () => {
        const configureSavedObject = createLegacyConfigSchema({
          id: '123',
          fields: null,
          name: 'connector',
          type: ConnectorTypes.jira,
        });

        const migratedConnector = configureConnectorIdMigration(
          configureSavedObject
        ) as SavedObjectSanitizedDoc<ESCasesConfigureAttributes>;

        expect(migratedConnector.references).toEqual([
          { id: '123', type: ACTION_SAVED_OBJECT_TYPE, name: connectorIDReferenceName },
        ]);
        expect(migratedConnector.attributes.connector).not.toHaveProperty('id');
      });
    });
  });
});
