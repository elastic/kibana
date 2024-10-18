/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useKibana } from '../../hooks/use_kibana';
import { GroupSelector } from './group_selector';
import { InventoryGroupAccordion } from './inventory_group_accordion';
import { groupCountCss } from './styles';
import { useInventoryParams } from '../../hooks/use_inventory_params';

export interface GroupedInventoryPageProps {
  setGroupSelected: (selected: string) => void;
}

export function GroupedInventoryView() {
  const {
    services: { inventoryAPIClient },
  } = useKibana();

  const { query } = useInventoryParams('/');
  const { kuery, entityTypes } = query;

  const { value = { groupBy: ENTITY_TYPE, groups: [] }, refresh } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities/group_by/{field}', {
        params: {
          path: {
            field: ENTITY_TYPE,
          },
          query: {
            kuery,
            entityTypes: entityTypes?.length ? JSON.stringify(entityTypes) : undefined,
          },
        },
        signal,
      });
    },
    [entityTypes, inventoryAPIClient, kuery]
  );

  const totalEntities = value.groups.reduce((acc, group) => acc + group.count, 0);

  return (
    <>
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <span css={groupCountCss}>
            <FormattedMessage
              id="xpack.inventory.groupedInventoryPage.entitiesTotalLabel"
              defaultMessage="{total} Entities"
              values={{ total: totalEntities }}
            />
          </span>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span css={groupCountCss} style={{ borderRight: 'none' }}>
            <FormattedMessage
              id="xpack.inventory.groupedInventoryPage.groupsTotalLabel"
              defaultMessage="{total} Groups"
              values={{ total: value.groups.length }}
            />
          </span>
        </EuiFlexItem>
        <EuiFlexItem grow />
        <EuiFlexItem grow={false}>
          <GroupSelector />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {value.groups.map((group) => (
        <InventoryGroupAccordion
          key={`${value.groupBy}-${group[value.groupBy]}`}
          group={group}
          groupBy={value.groupBy}
        />
      ))}
    </>
  );
}
