/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import {
  // EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { InventoryEntityDefinition } from '../../../common/entities';

export function EntityTypeListItem({
  href,
  icon,
  label,
  count,
}: {
  href: string;
  icon: string;
  label: string;
  count: number;
}) {
  return (
    <EuiLink data-test-subj="inventoryEntityTypeListBaseLink" href={href}>
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon size="s" type={icon} />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText size="s">{label}</EuiText>
        </EuiFlexItem>
        {/* <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{count}</EuiBadge>
        </EuiFlexItem> */}
      </EuiFlexGroup>
    </EuiLink>
  );
}

export function EntityTypeListBase({
  definitions,
  loading,
  error,
}: {
  loading?: boolean;
  definitions?: InventoryEntityDefinition[];
  error?: Error;
}) {
  const router = useInventoryRouter();
  if (loading) {
    return <EuiLoadingSpinner size="s" />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EntityTypeListItem
        href={router.link('/all')}
        icon="globe"
        count={0}
        label={i18n.translate('xpack.inventory.entityTypeList.allTypesLink', {
          defaultMessage: 'All',
        })}
      />
      {/* {definitions?.map((definition) => {
        return (
          <EntityTypeListItem
            key={definition.name}
            href={router.link('/{type}', { path: { type: definition.name } })}
            icon={definition.icon}
            count={definition.count}
            label={definition.label}
          />
        );
      })} */}
    </EuiFlexGroup>
  );
}

export function EntityTypeList() {
  const {
    services: { inventoryAPIClient },
  } = useKibana();

  const { value, loading, error } = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities/definition/inventory', {
        signal,
      });
    },
    [inventoryAPIClient]
  );

  return <EntityTypeListBase definitions={value?.definitions} error={error} loading={loading} />;
}
