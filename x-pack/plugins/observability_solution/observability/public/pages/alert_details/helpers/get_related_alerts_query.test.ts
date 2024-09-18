/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRelatedAlertKuery } from './get_related_alerts_query';

describe('getRelatedAlertKuery', () => {
  const tags = ['tag1', 'tag2'];
  const groups = [
    { field: 'group1Field', value: 'group1Value' },
    { field: 'group2Field', value: 'group2Value' },
  ];
  const tagsKuery = '(tags: tag1 or tags: tag2)';
  const groupsKuery =
    '(group1Field: group1Value or kibana.alert.group.value: group1Value) or (group2Field: group2Value or kibana.alert.group.value: group2Value)';

  it('should generate correct query with no tags or groups', () => {
    expect(getRelatedAlertKuery()).toBeUndefined();
  });

  it('should generate correct query for tags', () => {
    expect(getRelatedAlertKuery(tags)).toEqual(tagsKuery);
  });

  it('should generate correct query for groups', () => {
    expect(getRelatedAlertKuery(undefined, groups)).toEqual(groupsKuery);
  });

  it('should generate correct query for tags and groups', () => {
    expect(getRelatedAlertKuery(tags, groups)).toEqual(`${tagsKuery} or ${groupsKuery}`);
  });
});
