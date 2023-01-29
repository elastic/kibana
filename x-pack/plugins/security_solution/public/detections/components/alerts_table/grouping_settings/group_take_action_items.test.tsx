/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGroupTakeActionsItems } from '.';

describe('useGroupTakeActionsItems', () => {
  it('returns array take actions items available for alerts table if showAlertStatusActions is true', () => {
    const takeActionItems = useGroupTakeActionsItems({
      indexName: '.alerts-security.alerts-default',
      showAlertStatusActions: true,
    });

    expect(takeActionItems.length).toBe(3);
    expect(takeActionItems).toBe([]);
  });

  it('returns  empty array of take actions items available for alerts table if showAlertStatusActions is false', () => {
    const takeActionItems = useGroupTakeActionsItems({
      indexName: '.alerts-security.alerts-default',
      showAlertStatusActions: false,
    });

    expect(takeActionItems.length).toBe(0);
    expect(takeActionItems).toBe([]);
  });
});
