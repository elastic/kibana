/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiGeneralHistogramCount, KpiHistogram } from '../../../../../common/search_strategy';
import { formatGeneralHistogramData } from './format_general_histogram_data';

describe('formatGeneralHistogramData', () => {
  test('Picks up data from count.value', () => {
    const mockHistogramData = [
      {
        key_as_string: '2022-12-01T00:00:00.000Z',
        key: 1669852800000,
        doc_count: 4,
        count: {
          doc_count: 4,
        },
      } as KpiHistogram<KpiGeneralHistogramCount>,
    ];
    const result = formatGeneralHistogramData(mockHistogramData);

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "x": 1669852800000,
          "y": 4,
        },
      ]
    `);
  });

  test('Picks up data from count.doc_count - userAuthentications', () => {
    const mockUserAuthentications = [
      {
        key_as_string: '2022-12-01T04:00:00.000Z',
        key: 1669867200000,
        doc_count: 4,
        count: {
          value: 1,
        },
      },
    ];
    const result = formatGeneralHistogramData(mockUserAuthentications);

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "x": 1669867200000,
          "y": 1,
        },
      ]
    `);
  });
});
