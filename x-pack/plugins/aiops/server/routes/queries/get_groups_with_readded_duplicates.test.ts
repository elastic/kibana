/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { changePointGroups } from '../../../common/__mocks__/artificial_logs/change_point_groups';
import { changePoints } from '../../../common/__mocks__/artificial_logs/change_points';

import { duplicateIdentifier } from './duplicate_identifier';
import { getGroupsWithReaddedDuplicates } from './get_groups_with_readded_duplicates';
import { groupDuplicates } from './fetch_frequent_items';
import { getFieldValuePairCounts } from './get_field_value_pair_counts';
import { getMarkedDuplicates } from './get_marked_duplicates';

describe('getGroupsWithReaddedDuplicates', () => {
  it('gets groups with readded duplicates', () => {
    const groupedChangePoints = groupDuplicates(changePoints, duplicateIdentifier).filter(
      (g) => g.group.length > 1
    );

    const fieldValuePairCounts = getFieldValuePairCounts(changePointGroups);
    const markedDuplicates = getMarkedDuplicates(changePointGroups, fieldValuePairCounts);
    const groupsWithReaddedDuplicates = getGroupsWithReaddedDuplicates(
      markedDuplicates,
      groupedChangePoints
    );

    expect(groupsWithReaddedDuplicates).toEqual([
      {
        docCount: 792,
        group: [
          {
            duplicate: false,
            fieldName: 'response_code',
            fieldValue: '500',
          },
          {
            duplicate: false,
            fieldName: 'url',
            fieldValue: 'home.php',
          },
          {
            duplicate: false,
            fieldName: 'url',
            fieldValue: 'login.php',
          },
        ],
        id: '2038579476',
        pValue: 0.010770456205312423,
      },
    ]);
  });
});
