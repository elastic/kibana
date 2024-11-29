/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { get } from 'lodash';
import React from 'react';
import { SLOGroupingValueSelector } from './slo_grouping_value_selector';

export function SLOGroupings({ slo }: { slo: SLOWithSummaryResponse }) {
  const groups = [slo.groupBy].flat();
  const hasGroups = groups.length > 0 && !groups.includes(ALL_VALUE);

  if (!hasGroups) {
    return null;
  }

  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      {groups.map((groupingKey) => {
        const groupingValue = get(slo.groupings, groupingKey);
        return (
          <SLOGroupingValueSelector
            key={groupingKey}
            slo={slo}
            groupingKey={groupingKey}
            value={groupingValue ? String(groupingValue) : undefined}
          />
        );
      })}
    </EuiFlexGroup>
  );
}
