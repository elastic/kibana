/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeChi2PValue } from './data_comparison_utils';
import { Histogram } from './types';
import chi2test from '@stdlib/stats-chi2test';

describe('data_comparison_utils()', () => {
  describe('stats-chi2test()', () => {
    test('stats-chi2test should return pValue close to 0 for features that changed significantly', () => {
      const changedFeature = [
        /* A B C D */
        [252, 367, 381, 0], // expected_terms
        [261, 244, 239, 256], // observed_terms
      ];

      const changedResult = chi2test(changedFeature);
      // For 4 features, degrees of freedom should be 3
      expect(changedResult.df).toEqual(3);
      // Data drifted => pValue should be close to 0
      expect(changedResult.pValue).toEqual(0);
    });
    test('stats-chi2test should return pValue close to 1 for features that did not change', () => {
      const unchangedFeature = [
        /* A B C D */
        [260, 254, 229, 257], // expected_terms
        [260, 254, 229, 257], // observed_terms
      ];

      const unchangedResults = chi2test(unchangedFeature);
      // Degrees of freedom = 3
      expect(unchangedResults.df).toEqual(3);
      // Data not drifted => pValue should be close to 1
      expect(unchangedResults.pValue).toEqual(1);
    });
    test('stats-chi2test should return pValue between 0 and 1 for features that changed slightly', () => {
      const barelyChangedFeature = [
        /* A B C D */
        [260, 254, 229, 257], // expected_terms
        [248, 242, 248, 262], // observed_terms
      ];

      const barelyChangedResults = chi2test(barelyChangedFeature);
      // Degrees of freedom = 3
      expect(barelyChangedResults.df).toEqual(3);
      expect(barelyChangedResults.pValue).toEqual(0.7105185908097074);
    });
  });

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

    // test('should return close to 0 if datasets differ', () => {
    //   const baselineTerms: Histogram[] = [
    //     {
    //       key: 'yahya',
    //       doc_count: 0,
    //     },
    //     {
    //       key: 'jackson',
    //       doc_count: 1,
    //     },
    //   ];
    //   const driftedTerms: Histogram[] = [
    //     {
    //       key: 'jackson',
    //       doc_count: 0,
    //     },
    //     {
    //       key: 'yahya',
    //       doc_count: 2,
    //     },
    //   ];
    //   expect(computeChi2PValue(baselineTerms, driftedTerms)).toEqual(0.32718687779030553);
    //   expect(computeChi2PValue(referenceTerms, productionTerms)).toEqual(0);
    // });

    test('should return 1 if datasets are empty', () => {
      expect(computeChi2PValue([], [])).toEqual(1);
    });
  });
});
