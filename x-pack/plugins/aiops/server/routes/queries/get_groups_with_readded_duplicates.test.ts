/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantTermGroups } from '../../../common/__mocks__/artificial_logs/significant_term_groups';
import { significantTerms } from '../../../common/__mocks__/artificial_logs/significant_terms';

import { duplicateIdentifier } from './duplicate_identifier';
import { getGroupsWithReaddedDuplicates } from './get_groups_with_readded_duplicates';
import { groupDuplicates } from './fetch_frequent_item_sets';
import { getFieldValuePairCounts } from './get_field_value_pair_counts';
import { getMarkedDuplicates } from './get_marked_duplicates';

describe('getGroupsWithReaddedDuplicates', () => {
  it('gets groups with readded duplicates', () => {
    const groupedSignificantTerms = groupDuplicates(significantTerms, duplicateIdentifier).filter(
      (g) => g.group.length > 1
    );

    const fieldValuePairCounts = getFieldValuePairCounts(significantTermGroups);
    const markedDuplicates = getMarkedDuplicates(significantTermGroups, fieldValuePairCounts);
    const groupsWithReaddedDuplicates = getGroupsWithReaddedDuplicates(
      markedDuplicates,
      groupedSignificantTerms
    );

    expect(groupsWithReaddedDuplicates).toEqual([
      {
        docCount: 792,
        group: [
          {
            fieldName: 'response_code',
            fieldValue: '500',
            duplicate: 1,
            docCount: 1819,
            pValue: 2.9589053032077285e-12,
          },
          {
            fieldName: 'url',
            fieldValue: 'home.php',
            duplicate: 1,
            docCount: 1744,
            pValue: 0.010770456205312423,
          },
        ],
        id: '2038579476',
        pValue: 0.010770456205312423,
      },
    ]);
  });
});
