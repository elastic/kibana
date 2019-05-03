/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockBrowserFields } from '../../../containers/source/mock';

import { defaultHeaders } from './column_headers/default_headers';
import { getColumnHeaders } from './stateful_body';

describe('stateful_body', () => {
  describe('getColumnHeaders', () => {
    test('should return a full object of ColumnHeader from the default header', () => {
      const expectedData = [
        {
          aggregatable: true,
          category: 'base',
          columnHeaderType: 'not-filtered',
          description:
            'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
          example: '2016-05-23T08:05:34.853Z',
          id: '@timestamp',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          name: '@timestamp',
          searchable: true,
          type: 'date',
          width: 240,
        },
        {
          aggregatable: true,
          category: 'source',
          columnHeaderType: 'not-filtered',
          description: 'IP address of the source. Can be one or multiple IPv4 or IPv6 addresses.',
          example: '',
          id: 'source.ip',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          name: 'source.ip',
          searchable: true,
          type: 'ip',
          width: 180,
        },
        {
          aggregatable: true,
          category: 'destination',
          columnHeaderType: 'not-filtered',
          description:
            'IP address of the destination. Can be one or multiple IPv4 or IPv6 addresses.',
          example: '',
          id: 'destination.ip',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          name: 'destination.ip',
          searchable: true,
          type: 'ip',
          width: 180,
        },
      ];
      const mockHeader = defaultHeaders.filter(h =>
        ['@timestamp', 'source.ip', 'destination.ip'].includes(h.id)
      );
      expect(getColumnHeaders(mockHeader, mockBrowserFields)).toEqual(expectedData);
    });
  });
});
