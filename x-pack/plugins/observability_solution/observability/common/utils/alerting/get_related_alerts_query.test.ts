/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRelatedAlertKuery } from './get_related_alerts_query';
import { fromKueryExpression } from '@kbn/es-query';

describe('getRelatedAlertKuery', () => {
  const tags = ['tag1:v', 'tag2'];
  const groups = [
    { field: 'group1Field', value: 'group1Value' },
    { field: 'group2Field', value: 'group2:Value' },
  ];
  const tagsKuery = '(tags: "tag1:v" or tags: "tag2")';
  const groupsKuery =
    '(group1Field: "group1Value" or kibana.alert.group.value: "group1Value") or (group2Field: "group2:Value" or kibana.alert.group.value: "group2:Value")';

  it('should generate correct query with no tags or groups', () => {
    expect(getRelatedAlertKuery()).toBeUndefined();
  });

  it('should generate correct query for tags', () => {
    const kuery = getRelatedAlertKuery(tags);
    expect(kuery).toEqual(tagsKuery);

    // Should be able to parse keury without throwing error
    fromKueryExpression(kuery!);
  });

  it('should generate correct query for groups', () => {
    const kuery = getRelatedAlertKuery(undefined, groups);
    expect(kuery).toEqual(groupsKuery);

    // Should be able to parse keury without throwing error
    fromKueryExpression(kuery!);
  });

  it('should generate correct query for tags and groups', () => {
    const kuery = getRelatedAlertKuery(tags, groups);
    expect(kuery).toEqual(`${tagsKuery} or ${groupsKuery}`);

    // Should be able to parse keury without throwing error
    fromKueryExpression(kuery!);
  });
});
