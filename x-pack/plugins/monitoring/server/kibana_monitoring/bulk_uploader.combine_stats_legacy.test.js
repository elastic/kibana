/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KIBANA_STATS_TYPE_MONITORING, KIBANA_USAGE_TYPE, KIBANA_SETTINGS_TYPE } from '../../common/constants';
import { KIBANA_REPORTING_TYPE } from '../../../reporting/common/constants';
import { BulkUploader } from './bulk_uploader';

const getInitial = () => {
  return [
    [
      { 'index': { '_type': KIBANA_STATS_TYPE_MONITORING } },
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
        },
        'response_times': { 'average': 47, 'max': 47 },
        'timestamp': '2017-07-26T00:14:20.771Z',
      }
    ],
    [
      { 'index': { '_type': KIBANA_USAGE_TYPE } },
      {
        'dashboard': { 'total': 0 },
        'visualization': { 'total': 0 },
        'search': { 'total': 0 },
        'index_pattern': { 'total': 2 },
        'index': '.kibana'
      }
    ],
    [
      { 'index': { '_type': KIBANA_REPORTING_TYPE } },
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
      { 'index': { '_type': KIBANA_SETTINGS_TYPE } },
      { 'xpack': { 'defaultAdminEmail': 'tim@elastic.co' } }
    ]
  ];
};

// TODO use jest snapshotting
const getResult = () => {
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
        },
        'response_times': { 'average': 47, 'max': 47 },
        'timestamp': '2017-07-26T00:14:20.771Z',
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
      }
    ]
  ];
};

describe('Collector Types Combiner', () => {
  describe('with all the data types present', () => {
    it('provides settings, and combined stats/usage data', () => {
      // default gives all the data types
      const initial = getInitial();
      const result = BulkUploader.combineStatsLegacy(initial);
      expect(result).toEqual(getResult());
    });
  });
  describe('with settings data missing', () => {
    it('provides combined stats/usage data', () => {
      // default gives all the data types
      const initial = getInitial();
      const trimmedInitial = [ initial[0], initial[1], initial[2] ]; // just stats, usage and reporting, no settings
      const result = BulkUploader.combineStatsLegacy(trimmedInitial);
      const expectedResult = getResult();
      const trimmedExpectedResult = [ expectedResult[0] ]; // single combined item
      expect(result).toEqual(trimmedExpectedResult);
    });
  });
  describe('with usage data missing', () => {
    it('provides settings, and stats data', () => {
      // default gives all the data types
      const initial = getInitial();
      const trimmedInitial = [ initial[0], initial[3] ]; // just stats and settings, no usage or reporting
      const result = BulkUploader.combineStatsLegacy(trimmedInitial);
      const expectedResult = getResult();
      delete expectedResult[0][1].usage; // usage stats should not be present in the result
      const trimmedExpectedResult = [ expectedResult[0], expectedResult[1] ];
      expect(result).toEqual(trimmedExpectedResult);
    });
  });
  describe('with stats data missing', () => {
    it('provides settings data', () => {
      // default gives all the data types
      const initial = getInitial();
      const trimmedInitial = [ initial[3] ]; // just settings
      const result = BulkUploader.combineStatsLegacy(trimmedInitial);
      const expectedResult = getResult();
      const trimmedExpectedResult = [ expectedResult[1] ]; // just settings
      expect(result).toEqual(trimmedExpectedResult);
    });
  });

  it('throws an error if duplicate types are registered', () => {
    const combineWithDuplicate = () => {
      const initial = getInitial();
      const withDuplicate = [ initial[0] ].concat(initial);
      return BulkUploader.combineStatsLegacy(withDuplicate);
    };
    expect(combineWithDuplicate).toThrow(
      'Duplicate collector type identifiers found in payload! ' +
      'kibana_stats_monitoring,kibana_stats_monitoring,kibana,reporting,kibana_settings'
    );
  });
});
