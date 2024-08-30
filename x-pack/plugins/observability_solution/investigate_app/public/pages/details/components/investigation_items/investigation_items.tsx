/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { GetInvestigationResponse, Item } from '@kbn/investigation-shared';
import { pick } from 'lodash';
import React from 'react';
import { useRenderItems } from '../../hooks/use_render_items';
import { AddInvestigationItem } from '../add_investigation_item/add_investigation_item';
import { InvestigationItemsList } from '../investigation_items_list/investigation_items_list';
import { InvestigationSearchBar } from '../investigation_search_bar/investigation_search_bar';

export interface Props {
  investigation: GetInvestigationResponse;
}

export function InvestigationItems({ investigation }: Props) {
  const {
    renderableItems,
    globalParams,
    updateInvestigationParams,
    addItem,
    deleteItem,
    isAdding,
    isDeleting,
  } = useRenderItems({
    investigation,
  });

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

            updateInvestigationParams({ ...globalParams, timeRange: nextTimeRange });
          }}
        />

        <EuiFlexItem grow={false}>
          <InvestigationItemsList
            isLoading={isAdding || isDeleting}
            items={renderableItems}
            onItemCopy={async (copiedItem) => {
              await addItem(pick(copiedItem, ['title', 'type', 'params']));
            }}
            onItemDelete={async (deletedItem) => {
              await deleteItem(deletedItem.id);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <AddInvestigationItem
        timeRange={globalParams.timeRange}
        onItemAdd={async (item: Item) => await addItem(item)}
      />
    </EuiFlexGroup>
  );
}
