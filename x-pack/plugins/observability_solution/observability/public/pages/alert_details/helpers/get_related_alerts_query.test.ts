/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGroupQueries } from './get_related_alerts_query';

describe('getGroupQueries', () => {
  const tags = ['tag1', 'tag2'];
  const groups = [
    { field: 'group1Field', value: 'group1Value' },
    { field: 'group2Field', value: 'group2Value' },
  ];
  const tagsKuery = 'tags: tag1 or tags: tag2';
  const groupsKuery =
    'group1Field: group1Value or kibana.alert.group.value: group1Value or group2Field: group2Value or kibana.alert.group.value: group2Value';

  it('should generate correct query with no tags or groups', () => {
    expect(getGroupQueries()).toBeUndefined();
  });

  it('should generate correct query for tags', () => {
    expect(getGroupQueries(tags)).toEqual([
      {
        query: tagsKuery,
        language: 'kuery',
      },
    ]);
  });

  it('should generate correct query for groups', () => {
    expect(getGroupQueries(undefined, groups)).toEqual([
      {
        query: groupsKuery,
        language: 'kuery',
      },
    ]);
  });

  it('should generate correct query for tags and groups', () => {
    expect(getGroupQueries(tags, groups)).toEqual([
      {
        query: `${tagsKuery} or ${groupsKuery}`,
        language: 'kuery',
      },
    ]);
  });
});
