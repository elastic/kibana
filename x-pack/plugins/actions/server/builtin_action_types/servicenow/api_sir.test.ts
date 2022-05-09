/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { externalServiceSIRMock, sirParams } from './mocks';
import { ExternalServiceSIR, ObservableTypes } from './types';
import { apiSIR, combineObservables, formatObservables, prepareParams } from './api_sir';
let mockedLogger: jest.Mocked<Logger>;

describe('api_sir', () => {
  let externalService: jest.Mocked<ExternalServiceSIR>;

  beforeEach(() => {
    externalService = externalServiceSIRMock.create();
    jest.clearAllMocks();
  });

  describe('combineObservables', () => {
    test('it returns an empty array when both arguments are an empty array', async () => {
      expect(combineObservables([], [])).toEqual([]);
    });

    test('it returns an empty array when both arguments are an empty string', async () => {
      expect(combineObservables('', '')).toEqual([]);
    });

    test('it returns an empty array when a="" and b=[]', async () => {
      expect(combineObservables('', [])).toEqual([]);
    });

    test('it returns an empty array when a=[] and b=""', async () => {
      expect(combineObservables([], '')).toEqual([]);
    });

    test('it returns a if b is empty', async () => {
      expect(combineObservables('a', '')).toEqual(['a']);
    });

    test('it returns b if a is empty', async () => {
      expect(combineObservables([], ['b'])).toEqual(['b']);
    });

    test('it combines two strings', async () => {
      expect(combineObservables('a,b', 'c,d')).toEqual(['a', 'b', 'c', 'd']);
    });

    test('it combines two arrays', async () => {
      expect(combineObservables(['a'], ['b'])).toEqual(['a', 'b']);
    });

    test('it combines a string with an array', async () => {
      expect(combineObservables('a', ['b'])).toEqual(['a', 'b']);
    });

    test('it combines an array with a string ', async () => {
      expect(combineObservables(['a'], 'b')).toEqual(['a', 'b']);
    });

    test('it combines a "," concatenated string', async () => {
      expect(combineObservables(['a'], 'b,c,d')).toEqual(['a', 'b', 'c', 'd']);
      expect(combineObservables('b,c,d', ['a'])).toEqual(['b', 'c', 'd', 'a']);
    });

    test('it combines a "|" concatenated string', async () => {
      expect(combineObservables(['a'], 'b|c|d')).toEqual(['a', 'b', 'c', 'd']);
      expect(combineObservables('b|c|d', ['a'])).toEqual(['b', 'c', 'd', 'a']);
    });

    test('it combines a space concatenated string', async () => {
      expect(combineObservables(['a'], 'b c d')).toEqual(['a', 'b', 'c', 'd']);
      expect(combineObservables('b c d', ['a'])).toEqual(['b', 'c', 'd', 'a']);
    });

    test('it combines a "\\n" concatenated string', async () => {
      expect(combineObservables(['a'], 'b\nc\nd')).toEqual(['a', 'b', 'c', 'd']);
      expect(combineObservables('b\nc\nd', ['a'])).toEqual(['b', 'c', 'd', 'a']);
    });

    test('it combines a "\\r" concatenated string', async () => {
      expect(combineObservables(['a'], 'b\rc\rd')).toEqual(['a', 'b', 'c', 'd']);
      expect(combineObservables('b\rc\rd', ['a'])).toEqual(['b', 'c', 'd', 'a']);
    });

    test('it combines a "\\t" concatenated string', async () => {
      expect(combineObservables(['a'], 'b\tc\td')).toEqual(['a', 'b', 'c', 'd']);
      expect(combineObservables('b\tc\td', ['a'])).toEqual(['b', 'c', 'd', 'a']);
    });

    test('it combines two strings with different delimiter', async () => {
      expect(combineObservables('a|b|c', 'd e f')).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });
  });

  describe('formatObservables', () => {
    test('it formats array observables correctly', async () => {
      const expectedTypes: Array<[ObservableTypes, string]> = [
        [ObservableTypes.ip4, 'ipv4-addr'],
        [ObservableTypes.sha256, 'SHA256'],
        [ObservableTypes.url, 'URL'],
      ];

      for (const type of expectedTypes) {
        expect(formatObservables(['a', 'b', 'c'], type[0])).toEqual([
          { type: type[1], value: 'a' },
          { type: type[1], value: 'b' },
          { type: type[1], value: 'c' },
        ]);
      }
    });

    test('it removes duplicates from array observables correctly', async () => {
      expect(formatObservables(['a', 'a', 'c'], ObservableTypes.ip4)).toEqual([
        { type: 'ipv4-addr', value: 'a' },
        { type: 'ipv4-addr', value: 'c' },
      ]);
    });

    test('it formats an empty array correctly', async () => {
      expect(formatObservables([], ObservableTypes.ip4)).toEqual([]);
    });

    test('it removes empty observables correctly', async () => {
      expect(formatObservables(['a', '', 'c'], ObservableTypes.ip4)).toEqual([
        { type: 'ipv4-addr', value: 'a' },
        { type: 'ipv4-addr', value: 'c' },
      ]);
    });
  });

  describe('prepareParams', () => {
    test('it prepares the params correctly when the connector uses the old API', async () => {
      expect(prepareParams(true, sirParams)).toEqual({
        ...sirParams,
        incident: {
          ...sirParams.incident,
          dest_ip: '192.168.1.1,192.168.1.3',
          source_ip: '192.168.1.2,192.168.1.4',
          malware_hash: '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
          malware_url: 'https://example.com',
        },
      });
    });

    test('it prepares the params correctly when the connector does not uses the old API', async () => {
      expect(prepareParams(false, sirParams)).toEqual({
        ...sirParams,
        incident: {
          ...sirParams.incident,
          dest_ip: null,
          source_ip: null,
          malware_hash: null,
          malware_url: null,
        },
      });
    });

    test('it prepares the params correctly when the connector uses the old API and the observables are undefined', async () => {
      const {
        dest_ip: destIp,
        source_ip: sourceIp,
        malware_hash: malwareHash,
        malware_url: malwareURL,
        ...incidentWithoutObservables
      } = sirParams.incident;

      expect(
        prepareParams(true, {
          ...sirParams,
          // @ts-expect-error
          incident: incidentWithoutObservables,
        })
      ).toEqual({
        ...sirParams,
        incident: {
          ...sirParams.incident,
          dest_ip: null,
          source_ip: null,
          malware_hash: null,
          malware_url: null,
        },
      });
    });
  });

  describe('pushToService', () => {
    test('it creates an incident correctly', async () => {
      const params = { ...sirParams, incident: { ...sirParams.incident, externalId: null } };
      const res = await apiSIR.pushToService({
        externalService,
        params,
        config: { usesTableApi: false },
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'work_notes',
      });

      expect(res).toEqual({
        id: 'incident-1',
        title: 'INC01',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
        comments: [
          {
            commentId: 'case-comment-1',
            pushedDate: '2020-03-10T12:24:20.000Z',
          },
          {
            commentId: 'case-comment-2',
            pushedDate: '2020-03-10T12:24:20.000Z',
          },
        ],
      });
    });

    test('it adds observables correctly', async () => {
      const params = { ...sirParams, incident: { ...sirParams.incident, externalId: null } };
      await apiSIR.pushToService({
        externalService,
        params,
        config: { usesTableApi: false },
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'work_notes',
      });

      expect(externalService.bulkAddObservableToIncident).toHaveBeenCalledWith(
        [
          { type: 'ipv4-addr', value: '192.168.1.1' },
          { type: 'ipv4-addr', value: '192.168.1.3' },
          { type: 'ipv4-addr', value: '192.168.1.2' },
          { type: 'ipv4-addr', value: '192.168.1.4' },
          {
            type: 'SHA256',
            value: '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
          },
          { type: 'URL', value: 'https://example.com' },
        ],
        // createIncident mock returns this incident id
        'incident-1'
      );
    });

    test('it does not call bulkAddObservableToIncident if the connector uses the old API', async () => {
      const params = { ...sirParams, incident: { ...sirParams.incident, externalId: null } };
      await apiSIR.pushToService({
        externalService,
        params,
        config: { usesTableApi: true },
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'work_notes',
      });

      expect(externalService.bulkAddObservableToIncident).not.toHaveBeenCalled();
    });

    test('it does not call bulkAddObservableToIncident if there are no observables', async () => {
      const params = {
        ...sirParams,
        incident: {
          ...sirParams.incident,
          dest_ip: null,
          source_ip: null,
          malware_hash: null,
          malware_url: null,
          externalId: null,
        },
      };

      await apiSIR.pushToService({
        externalService,
        params,
        config: { usesTableApi: false },
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'work_notes',
      });

      expect(externalService.bulkAddObservableToIncident).not.toHaveBeenCalled();
    });
  });
});
