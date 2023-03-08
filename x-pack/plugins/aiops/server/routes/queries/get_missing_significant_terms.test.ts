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
import { dropDuplicates, groupDuplicates } from './fetch_frequent_item_sets';
import { getFieldValuePairCounts } from './get_field_value_pair_counts';
import { getMarkedDuplicates } from './get_marked_duplicates';
import { getMissingSignificantTerms } from './get_missing_significant_terms';

describe('getMissingSignificantTerms', () => {
  it('get missing significant terms', () => {
    const deduplicatedSignificantTerms = dropDuplicates(significantTerms, duplicateIdentifier);

    const groupedSignificantTerms = groupDuplicates(significantTerms, duplicateIdentifier).filter(
      (g) => g.group.length > 1
    );

    const fieldValuePairCounts = getFieldValuePairCounts(significantTermGroups);
    const markedDuplicates = getMarkedDuplicates(significantTermGroups, fieldValuePairCounts);
    const groupsWithReaddedDuplicates = getGroupsWithReaddedDuplicates(
      markedDuplicates,
      groupedSignificantTerms
    );

    const missingSignificantTerms = getMissingSignificantTerms(
      deduplicatedSignificantTerms,
      groupsWithReaddedDuplicates
    );

    expect(missingSignificantTerms).toEqual([
      {
        bg_count: 553,
        doc_count: 1981,
        fieldName: 'user',
        fieldValue: 'Peter',
        normalizedScore: 0.8327337555873047,
        pValue: 2.7454255728359757e-21,
        score: 47.34435085428873,
        total_bg_count: 1975,
        total_doc_count: 4671,
      },
    ]);
  });
});
