/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCollectorTypesCombiner } from '../get_collector_types_combiner';
import expect from 'expect.js';

const getInitial = () => {
  return [
    [
      { 'index': { '_type': 'kibana_stats' } },
      {
        'host': 'tsullivan.local',
        'concurrent_connections': 0,
        'os': {
          'load': { '1m': 2.28857421875, '5m': 2.45068359375, '15m': 2.29248046875 },
          'memory': { 'total_in_bytes': 17179869184, 'free_in_bytes': 527749120, 'used_in_bytes': 16652120064 },
          'uptime_in_millis': 1211027000
        },
        'process': {
          'event_loop_delay': 4.222616970539093,
          'memory': {
            'heap': { 'total_in_bytes': 219455488, 'used_in_bytes': 152622064, 'size_limit': 1501560832 },
            'resident_set_size_in_bytes': 245923840
          },
          'uptime_in_millis': 18467
        },
        'requests': {
          'disconnects': 0,
          'total': 2,
          'status_codes': { '200': 2 }
        },
        'response_times': { 'average': 47, 'max': 47 },
        'timestamp': '2017-07-26T00:14:20.771Z',
      }
    ],
    [
      { 'index': { '_type': 'kibana' } },
      {
        'dashboard': { 'total': 0 },
        'visualization': { 'total': 0 },
        'search': { 'total': 0 },
        'index_pattern': { 'total': 2 },
        'index': '.kibana'
      }
    ],
    [
      { 'index': { '_type': 'reporting_stats' } },
      {
        'available': true,
        'enabled': false,
        '_all': 55,
        'csv': {
          'available': true,
          'count': 25
        },
        'printable_pdf': {
          'available': true,
          'count': 30
        }
      }
    ],
    [
      { 'index': { '_type': 'kibana_settings' } },
      { 'xpack': { 'defaultAdminEmail': 'tim@elastic.co' } }
    ]
  ];
};

const getResult = () => {
  return [
    [
      { 'index': { '_type': 'kibana_stats' } },
      {
        'concurrent_connections': 0,
        'os': {
          'load': { '1m': 2.28857421875, '5m': 2.45068359375, '15m': 2.29248046875 },
          'memory': { 'total_in_bytes': 17179869184, 'free_in_bytes': 527749120, 'used_in_bytes': 16652120064 },
          'uptime_in_millis': 1211027000
        },
        'process': {
          'event_loop_delay': 4.222616970539093,
          'memory': {
            'heap': { 'total_in_bytes': 219455488, 'used_in_bytes': 152622064, 'size_limit': 1501560832 },
            'resident_set_size_in_bytes': 245923840
          },
          'uptime_in_millis': 18467
        },
        'requests': {
          'disconnects': 0,
          'total': 2,
          'status_codes': { '200': 2 }
        },
        'response_times': { 'average': 47, 'max': 47 },
        'timestamp': '2017-07-26T00:14:20.771Z',
        'kibana': {
          'uuid': '5b2de169-2785-441b-ae8c-186a1936b17d',
          'name': 'tsullivan.local',
          'index': '.kibana',
          'host': 'tsullivan.local',
          'transport_address': 'tsullivan.local:5601',
          'version': '6.0.0-beta1',
          'snapshot': false,
          'status': 'green'
        },
        'usage': {
          'dashboard': { 'total': 0 },
          'visualization': { 'total': 0 },
          'search': { 'total': 0 },
          'index_pattern': { 'total': 2 },
          'index': '.kibana',
          'xpack': {
            'reporting': {
              '_all': 55,
              'available': true,
              'csv': {
                'available': true,
                'count': 25,
              },
              'enabled': false,
              'printable_pdf': {
                'available': true,
                'count': 30,
              }
            }
          }
        }
      }
    ],
    [
      { 'index': { '_type': 'kibana_settings' } },
      {
        'xpack': { 'defaultAdminEmail': 'tim@elastic.co' },
        'kibana': {
          'uuid': '5b2de169-2785-441b-ae8c-186a1936b17d',
          'name': 'tsullivan.local',
          'index': '.kibana',
          'host': 'tsullivan.local',
          'transport_address': 'tsullivan.local:5601',
          'version': '6.0.0-beta1',
          'snapshot': false,
          'status': 'green'
        }
      }
    ]
  ];
};

const kbnServerMock = {};
const configMock = {};
const sourceKibanaMock = () => ({
  uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
  name: 'tsullivan.local',
  index: '.kibana',
  host: 'tsullivan.local',
  transport_address: 'tsullivan.local:5601',
  version: '6.0.0-beta1',
  snapshot: false,
  status: 'green'
});

describe('Collector Types Combiner', () => {
  describe('with all the data types present', () => {
    it('provides settings, and combined stats/usage data', () => {
      // default gives all the data types
      const initial = getInitial();
      const combiner = getCollectorTypesCombiner(kbnServerMock, configMock, sourceKibanaMock);
      const result = combiner(initial);
      expect(result).to.eql(getResult());
    });
  });
  describe('with settings data missing', () => {
    it('provides combined stats/usage data', () => {
      // default gives all the data types
      const initial = getInitial();
      const trimmedInitial = [ initial[0], initial[1], initial[2] ]; // just stats, usage and reporting, no settings
      const combiner = getCollectorTypesCombiner(kbnServerMock, configMock, sourceKibanaMock);
      const result = combiner(trimmedInitial);
      const expectedResult = getResult();
      const trimmedExpectedResult = [ expectedResult[0] ]; // single combined item
      expect(result).to.eql(trimmedExpectedResult);
    });
  });
  describe('with usage data missing', () => {
    it('provides settings, and stats data', () => {
      // default gives all the data types
      const initial = getInitial();
      const trimmedInitial = [ initial[0], initial[3] ]; // just stats and settings, no usage or reporting
      const combiner = getCollectorTypesCombiner(kbnServerMock, configMock, sourceKibanaMock);
      const result = combiner(trimmedInitial);
      const expectedResult = getResult();
      delete expectedResult[0][1].usage; // usage stats should not be present in the result
      const trimmedExpectedResult = [ expectedResult[0], expectedResult[1] ];
      expect(result).to.eql(trimmedExpectedResult);
    });
  });
  describe('with stats data missing', () => {
    it('provides settings data', () => {
      // default gives all the data types
      const initial = getInitial();
      const trimmedInitial = [ initial[3] ]; // just settings
      const combiner = getCollectorTypesCombiner(kbnServerMock, configMock, sourceKibanaMock);
      const result = combiner(trimmedInitial);
      const expectedResult = getResult();
      const trimmedExpectedResult = [ expectedResult[1] ]; // just settings
      expect(result).to.eql(trimmedExpectedResult);
    });
  });
});
