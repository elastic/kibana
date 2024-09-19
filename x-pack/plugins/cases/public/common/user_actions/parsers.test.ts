/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes, noneConnectorId } from '../../../common';
import { parseStringAsConnector, parseStringAsExternalService } from './parsers';

describe('user actions utility functions', () => {
  describe('parseStringAsConnector', () => {
    it('return null if the data is null', () => {
      expect(parseStringAsConnector('', null)).toBeNull();
    });

    it('return null if the data is not a json object', () => {
      expect(parseStringAsConnector('', 'blah')).toBeNull();
    });

    it('return null if the data is not a valid connector', () => {
      expect(parseStringAsConnector('', JSON.stringify({ a: '1' }))).toBeNull();
    });

    it('return null if id is null but the data is a connector other than none', () => {
      expect(
        parseStringAsConnector(
          null,
          JSON.stringify({ type: ConnectorTypes.jira, name: '', fields: null })
        )
      ).toBeNull();
    });

    it('return the id as the none connector if the data is the none connector', () => {
      expect(
        parseStringAsConnector(
          null,
          JSON.stringify({ type: ConnectorTypes.none, name: '', fields: null })
        )
      ).toEqual({ id: noneConnectorId, type: ConnectorTypes.none, name: '', fields: null });
    });

    it('returns a decoded connector with the specified id', () => {
      expect(
        parseStringAsConnector(
          'a',
          JSON.stringify({ type: ConnectorTypes.jira, name: 'hi', fields: null })
        )
      ).toEqual({ id: 'a', type: ConnectorTypes.jira, name: 'hi', fields: null });
    });
  });

  describe('parseStringAsExternalService', () => {
    it('returns null when the data is null', () => {
      expect(parseStringAsExternalService('', null)).toBeNull();
    });

    it('returns null when the data is not valid json', () => {
      expect(parseStringAsExternalService('', 'blah')).toBeNull();
    });

    it('returns null when the data is not a valid external service object', () => {
      expect(parseStringAsExternalService('', JSON.stringify({ a: '1' }))).toBeNull();
    });

    it('returns the decoded external service with the connector_id field added', () => {
      const externalServiceInfo = {
        connector_name: 'name',
        external_id: '1',
        external_title: 'title',
        external_url: 'abc',
        pushed_at: '1',
        pushed_by: {
          username: 'a',
          email: 'a@a.com',
          full_name: 'a',
        },
      };

      expect(parseStringAsExternalService('500', JSON.stringify(externalServiceInfo))).toEqual({
        ...externalServiceInfo,
        connector_id: '500',
      });
    });
  });
});
