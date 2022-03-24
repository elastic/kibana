/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockBrowserFields } from '../../../../../common/containers/source/mock';

import { defaultHeaders } from './default_headers';
import { getColumnWidthFromType, getColumnHeaders } from './helpers';
import { DEFAULT_COLUMN_MIN_WIDTH, DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../constants';
import '../../../../../common/mock/match_media';

describe('helpers', () => {
  describe('getColumnWidthFromType', () => {
    test('it returns the expected width for a non-date column', () => {
      expect(getColumnWidthFromType('keyword')).toEqual(DEFAULT_COLUMN_MIN_WIDTH);
    });

    test('it returns the expected width for a date column', () => {
      expect(getColumnWidthFromType('date')).toEqual(DEFAULT_DATE_COLUMN_MIN_WIDTH);
    });
  });

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
          format: '',
          id: '@timestamp',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          name: '@timestamp',
          readFromDocValues: true,
          searchable: true,
          type: 'date',
          initialWidth: 190,
        },
        {
          aggregatable: true,
          category: 'source',
          columnHeaderType: 'not-filtered',
          description: 'IP address of the source. Can be one or multiple IPv4 or IPv6 addresses.',
          example: '',
          format: '',
          id: 'source.ip',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          name: 'source.ip',
          searchable: true,
          type: 'ip',
          initialWidth: 180,
        },
        {
          aggregatable: true,
          category: 'destination',
          columnHeaderType: 'not-filtered',
          description:
            'IP address of the destination. Can be one or multiple IPv4 or IPv6 addresses.',
          example: '',
          format: '',
          id: 'destination.ip',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          name: 'destination.ip',
          searchable: true,
          type: 'ip',
          initialWidth: 180,
        },
      ];
      const mockHeader = defaultHeaders.filter((h) =>
        ['@timestamp', 'source.ip', 'destination.ip'].includes(h.id)
      );
      expect(getColumnHeaders(mockHeader, mockBrowserFields)).toEqual(expectedData);
    });
  });
});
