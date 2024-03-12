/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockTimelineData } from '../../../../../common/mock';
import { defaultUdtHeaders } from '../../unified_components/default_headers';
import { getFormattedFields } from './formatted_field_udt';
import type { DataTableRecord } from '@kbn/discover-utils/types';

describe('formatted_fields_udt', () => {
  describe('getFormattedFields', () => {
    it('should return correct map for all the present headers', () => {
      const result = getFormattedFields({
        dataTableRows: mockTimelineData.map((row) => ({
          ...row,
          id: '',
          raw: {} as DataTableRecord['raw'],
          flattened: {} as DataTableRecord['flattened'],
        })),
        headers: defaultUdtHeaders,
        scopeId: 'timeline',
      });

      const expected = {
        '@timestamp': expect.any(Function),
        message: expect.any(Function),
        'event.category': expect.any(Function),
        'event.action': expect.any(Function),
        'host.name': expect.any(Function),
        'source.ip': expect.any(Function),
        'destination.ip': expect.any(Function),
        'user.name': expect.any(Function),
      };

      expect(result).toMatchObject(expected);
    });
  });
});
