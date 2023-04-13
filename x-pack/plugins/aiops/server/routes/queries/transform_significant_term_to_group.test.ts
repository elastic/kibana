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
import { getMissingSignificantTerms } from './get_missing_significant_terms';
import { transformSignificantTermToGroup } from './transform_significant_term_to_group';

describe('getMissingSignificantTerms', () => {
  it('get missing significant terms', () => {
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
      significantTerms,
      groupsWithReaddedDuplicates
    );

    const transformed = transformSignificantTermToGroup(
      missingSignificantTerms[0],
      groupedSignificantTerms
    );

    expect(transformed).toEqual({
      docCount: 1738,
      group: [
        {
          duplicate: 1,
          fieldName: 'url',
          fieldValue: 'login.php',
          docCount: 1738,
          pValue: 0.010770456205312423,
        },
      ],
      id: '368426784',
      pValue: 0.010770456205312423,
    });
  });
});
