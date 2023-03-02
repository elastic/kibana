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
import { transformSignificantTermToGroup } from './transform_significant_term_to_group';

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

    const transformed = transformSignificantTermToGroup(
      missingSignificantTerms[0],
      groupedSignificantTerms
    );

    expect(transformed).toEqual({
      docCount: 1981,
      group: [{ duplicate: false, fieldName: 'user', fieldValue: 'Peter' }],
      id: '817080373',
      pValue: 2.7454255728359757e-21,
    });
  });
});
