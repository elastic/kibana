/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { SLOGroupingValueSelector } from './slo_grouping_value_selector';

export function SLOGroupings({ slo }: { slo: SLOWithSummaryResponse }) {
  const groupingKeys = Object.entries(slo.groupings ?? {});

  if (groupingKeys.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      {groupingKeys.map(([groupingKey, groupingValue]) => (
        <SLOGroupingValueSelector
          key={groupingKey}
          slo={slo}
          groupingKey={groupingKey}
          value={String(groupingValue)}
        />
      ))}
    </EuiFlexGroup>
  );
}
