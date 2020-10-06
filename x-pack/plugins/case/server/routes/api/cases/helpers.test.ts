/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsFindResponse } from 'kibana/server';
import {
  CaseConnector,
  ConnectorTypes,
  ESCaseConnector,
  ESCasesConfigureAttributes,
} from '../../../../common/api';
import { mockCaseConfigure } from '../__fixtures__';
import {
  transformCaseConnectorToEsConnector,
  transformESConnectorToCaseConnector,
  getConnectorFromConfiguration,
} from './helpers';

describe('helpers', () => {
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
});
