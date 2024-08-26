/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { GetInvestigationResponse, Item } from '@kbn/investigation-shared';
import { pick } from 'lodash';
import React from 'react';
import { useAddInvestigationItem } from '../../../../hooks/use_add_investigation_item';
import { useDeleteInvestigationItem } from '../../../../hooks/use_delete_investigation_item';
import { useFetchInvestigationItems } from '../../../../hooks/use_fetch_investigation_items';
import { useRenderItems } from '../../hooks/use_render_items';
import { AddInvestigationItem } from '../add_investigation_item/add_investigation_item';
import { InvestigationItemsList } from '../investigation_items_list/investigation_items_list';
import { InvestigationSearchBar } from '../investigation_search_bar/investigation_search_bar';

export interface Props {
  investigationId: string;
  investigation: GetInvestigationResponse;
}

export function InvestigationItems({ investigationId, investigation }: Props) {
  const { data: items, refetch } = useFetchInvestigationItems({
    investigationId,
    initialItems: investigation.items,
  });
  const renderableItems = useRenderItems({ items, params: investigation.params });

  const { mutateAsync: addInvestigationItem, isLoading: isAdding } = useAddInvestigationItem();
  const { mutateAsync: deleteInvestigationItem, isLoading: isDeleting } =
    useDeleteInvestigationItem();

  const onAddItem = async (item: Item) => {
    await addInvestigationItem({ investigationId, item });
    refetch();
  };

  const onDeleteItem = async (itemId: string) => {
    await deleteInvestigationItem({ investigationId, itemId });
    refetch();
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexGroup direction="column" gutterSize="m">
        <InvestigationSearchBar
          dateRangeFrom={
            investigation ? new Date(investigation.params.timeRange.from).toISOString() : undefined
          }
          dateRangeTo={
            investigation ? new Date(investigation.params.timeRange.to).toISOString() : undefined
          }
          onQuerySubmit={async ({ dateRange }) => {
            // const nextDateRange = {
            //   from: datemath.parse(dateRange.from)!.toISOString(),
            //   to: datemath.parse(dateRange.to)!.toISOString(),
            // };
            // await setGlobalParameters({
            //   ...renderableInvestigation.parameters,
            //   timeRange: nextDateRange,
            // });
          }}
        />

        <EuiFlexItem grow={false}>
          <InvestigationItemsList
            isLoading={isAdding || isDeleting}
            items={renderableItems}
            onItemCopy={async (copiedItem) => {
              await onAddItem(pick(copiedItem, ['title', 'type', 'params']));
            }}
            onItemDelete={async (deletedItem) => {
              await onDeleteItem(deletedItem.id);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <AddInvestigationItem
        timeRange={{
          from: new Date(investigation.params.timeRange.from).toISOString(),
          to: new Date(investigation.params.timeRange.to).toISOString(),
        }}
        onItemAdd={onAddItem}
      />
    </EuiFlexGroup>
  );
}
