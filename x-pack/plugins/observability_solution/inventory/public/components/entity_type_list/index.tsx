/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { EntityTypeDefinition } from '../../../common/entities';

export function EntityTypeListBase({
  definitions,
  loading,
  error,
}: {
  loading?: boolean;
  definitions?: EntityTypeDefinition[];
  error?: Error;
}) {
  if (loading) {
    return <EuiLoadingSpinner size="s" />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {definitions?.map((definition) => {
        return (
          <EuiLink data-test-subj="inventoryEntityTypeListBaseLink" href={definition.type}>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon size="s" type={definition.icon} />
              </EuiFlexItem>
              <EuiFlexItem grow>
                <EuiText size="s">{definition.label}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{definition.count}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
        );
      })}
    </EuiFlexGroup>
  );
}

export function EntityTypeList() {
  const {
    services: { callInventoryApi },
  } = useKibana();

  const { value, loading, error } = useAbortableAsync(
    ({ signal }) => {
      return callInventoryApi('GET /internal/inventory/entity_types', {
        signal,
      });
    },
    [callInventoryApi]
  );

  return <EntityTypeListBase definitions={value?.definitions} error={error} loading={loading} />;
}
