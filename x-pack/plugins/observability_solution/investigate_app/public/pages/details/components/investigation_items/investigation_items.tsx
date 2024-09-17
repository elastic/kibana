/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useInvestigation } from '../../contexts/investigation_context';
import { AddInvestigationItem } from '../add_investigation_item/add_investigation_item';
import { InvestigationItemsList } from '../investigation_items_list/investigation_items_list';
import { InvestigationSearchBar } from '../investigation_search_bar/investigation_search_bar';

export function InvestigationItems() {
  const { globalParams, updateInvestigationParams } = useInvestigation();

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup direction="column" gutterSize="m">
        <InvestigationSearchBar
          dateRangeFrom={globalParams.timeRange.from}
          dateRangeTo={globalParams.timeRange.to}
          onQuerySubmit={async ({ dateRange }) => {
            const nextTimeRange = {
              from: datemath.parse(dateRange.from)!.toISOString(),
              to: datemath.parse(dateRange.to)!.toISOString(),
            };

            updateInvestigationParams({ timeRange: nextTimeRange });
          }}
        />

        <EuiFlexItem grow={false}>
          <InvestigationItemsList />
        </EuiFlexItem>
      </EuiFlexGroup>

      <AddInvestigationItem />
    </EuiFlexGroup>
  );
}
