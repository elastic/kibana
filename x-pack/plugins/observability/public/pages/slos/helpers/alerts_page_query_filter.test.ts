/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toAlertsPageQueryFilter } from './alerts_page_query_filter';

describe('AlertsPageQueryFilter', () => {
  it('computes the query filter correctly', async () => {
    expect(
      toAlertsPageQueryFilter({ count: 2, ruleIds: ['rule-1', 'rule-2'] })
    ).toMatchInlineSnapshot(
      `"(kuery:'kibana.alert.rule.uuid:\\"rule-1\\" or kibana.alert.rule.uuid:\\"rule-2\\"',rangeFrom:now-15m,rangeTo:now,status:all)"`
    );
  });
});
