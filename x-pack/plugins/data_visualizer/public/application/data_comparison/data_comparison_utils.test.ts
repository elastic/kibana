/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeChi2PValue } from './data_comparison_utils';
import { Histogram } from './types';

describe('data_comparison_utils()', () => {
  describe('computeChi2PValue()', () => {
    const referenceTerms: Histogram[] = [
      {
        key: 'ap-northwest-1',
        doc_count: 40348,
      },
      {
        key: 'us-east-1',
        doc_count: 15134,
      },
      {
        key: 'eu-central-1',
        doc_count: 12614,
      },
      {
        key: 'sa-east-1',
        doc_count: 80654,
      },
    ];

    const productionTerms: Histogram[] = [
      {
        key: 'ap-northwest-1',
        doc_count: 40320,
      },
      {
        key: 'us-east-1',
        doc_count: 15127,
      },
      {
        key: 'eu-central-1',
        doc_count: 12614,
      },
      {
        key: 'sa-east-1',
        doc_count: 86440,
      },
    ];

    test('should return pValue close to 1 if datasets are both empty or nearly identical', () => {
      expect(computeChi2PValue(referenceTerms, referenceTerms)).toEqual(1);
      expect(
        computeChi2PValue(
          referenceTerms,
          referenceTerms.sort((t1, t2) => t1.doc_count - t2.doc_count)
        )
      ).toEqual(1);

      expect(
        computeChi2PValue(referenceTerms, [
          ...referenceTerms,
          {
            key: 'sa-east-1',
            doc_count: 86410,
          },
        ])
      ).toEqual(1);
    });

    test('should return close to 0 if datasets differ', () => {
      const baselineTerms: Histogram[] = [
        {
          key: 'yahya',
          doc_count: 0,
        },
        {
          key: 'jackson',
          doc_count: 1,
        },
      ];
      const driftedTerms: Histogram[] = [
        {
          key: 'jackson',
          doc_count: 0,
        },
        {
          key: 'yahya',
          doc_count: 5,
        },
      ];
      expect(computeChi2PValue(baselineTerms, driftedTerms)).toEqual(0.32718687779030553);
      expect(computeChi2PValue(referenceTerms, productionTerms)).toEqual(0);
    });

    test('should return 1 if datasets are empty', () => {
      expect(computeChi2PValue([], [])).toEqual(1);
    });
  });
});
