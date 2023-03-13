/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBadgeMetrics } from '.';

describe('getBadgeMetrics', () => {
  it('returns array of badges which roccespondes to the field name', () => {
    const badgesRuleName = getBadgeMetrics('kibana.alert.rule.name', {
      key: ['Rule name test', 'Some description'],
      usersCountAggregation: {
        value: 10,
      },
      doc_count: 10,
    });

    expect(
      badgesRuleName.find((badge) => badge.title === 'Users:' && badge.value === 10)
    ).toBeTruthy();
    expect(
      badgesRuleName.find((badge) => badge.title === 'Alerts:' && badge.value === 10)
    ).toBeTruthy();

    const badgesHostName = getBadgeMetrics('host.name', {
      key: 'Host',
      rulesCountAggregation: {
        value: 3,
      },
      doc_count: 2,
    });

    expect(
      badgesHostName.find((badge) => badge.title === 'Rules:' && badge.value === 3)
    ).toBeTruthy();

    const badgesUserName = getBadgeMetrics('user.name', {
      key: 'User test',
      hostsCountAggregation: {
        value: 1,
      },
      doc_count: 1,
    });
    expect(
      badgesUserName.find((badge) => badge.title === `IP's:` && badge.value === 1)
    ).toBeTruthy();
  });

  it('returns default badges if the field specific does not exist', () => {
    const badges = getBadgeMetrics('process.name', {
      key: 'process',
      rulesCountAggregation: {
        value: 3,
      },
      doc_count: 10,
    });

    expect(badges.length).toBe(2);
    expect(badges.find((badge) => badge.title === 'Rules:' && badge.value === 3)).toBeTruthy();
    expect(badges.find((badge) => badge.title === 'Alerts:' && badge.value === 10)).toBeTruthy();
  });
});
