/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapGrouping } from '../../../../common/service_map';
import { formatServiceGroupingCountLine } from './format_service_grouping_count_line';

const grouping: ServiceMapGrouping = {
  services: ['cart', 'checkout', 'opbeans-go', 'opbeans-node'],
  automatic: 'namePrefix',
  strategies: [
    {
      source: 'namePrefix',
      passes: true,
      groups: [
        { id: 'namePrefix:cart', kind: 'attribute', attribute: 'namePrefix', value: 'cart' },
        { id: 'namePrefix:opbeans', kind: 'attribute', attribute: 'namePrefix', value: 'opbeans' },
      ],
      // Two closed groups in the payload. The caller passes how many squares were drawn.
      assignment: [0, 0, 1, 1],
    },
  ],
};

describe('formatServiceGroupingCountLine', () => {
  it('uses the closed-group count that was actually drawn', () => {
    expect(formatServiceGroupingCountLine(grouping, 1)).toBe(
      '4 services in 1 group, by name prefix'
    );
  });

  it('still formats when closedGroupCount is 0 (caller decides whether to show it)', () => {
    expect(formatServiceGroupingCountLine(grouping, 0)).toBe(
      '4 services in 0 groups, by name prefix'
    );
  });
});
