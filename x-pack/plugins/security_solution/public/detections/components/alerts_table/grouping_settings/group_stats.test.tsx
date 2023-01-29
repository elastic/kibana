/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSelectedGroupBadgeMetrics } from '.';

describe('getSelectedGroupBadgeMetrics', () => {
  it('returns array of badges which roccespondes to the field name', () => {
    const badgesRuleName = getSelectedGroupBadgeMetrics('kibana.alert.rule.name', {
      key: ['Rule name test', 'Some description'],
      usersCountAggregation: {
        value: 10,
      },
      doc_count: 10,
    });

    expect(
      badgesRuleName.find((badge) => badge.title === 'Users:' && badge.value === 10)
    ).toBeTruthy();

    const badgesHostName = getSelectedGroupBadgeMetrics('host.name', {
      key: 'Host',
      doc_count: 2,
    });

    expect(
      badgesHostName.find((badge) => badge.title === 'Users:' && badge.value === 10)
    ).toBeTruthy();

    const badgesUserName = getSelectedGroupBadgeMetrics('user.name', {
      key: 'User test',
      doc_count: 1,
    });
    expect(
      badgesUserName.find((badge) => badge.title === 'Users:' && badge.value === 10)
    ).toBeTruthy();
  });

  it('returns default badges if the field specific does not exist', () => {
    const badges = getSelectedGroupBadgeMetrics('process.name', {
      key: 'process',
      doc_count: 10,
    });

    expect(badges.length).toBe(2);
    expect(badges.find((badge) => badge.title === 'Users:' && badge.value === 10)).toBeTruthy();
  });
});
