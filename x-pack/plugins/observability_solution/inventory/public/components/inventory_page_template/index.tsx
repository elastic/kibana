/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { TechnicalPreviewBadge } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../hooks/use_kibana';
import { SearchBar } from '../search_bar';
import { getEntityManagerEnablement } from './no_data_config';
import { useEntityManager } from '../../hooks/use_entity_manager';
import { Welcome } from '../entity_enablement/welcome_modal';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { EmptyState } from '../empty_states/empty_state';

const pageTitle = (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem grow={false}>
      {i18n.translate('xpack.inventory.inventoryPageHeaderLabel', {
        defaultMessage: 'Inventory',
      })}
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <TechnicalPreviewBadge />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export function InventoryPageTemplate({ children }: { children: React.ReactNode }) {
  const {
    services: { observabilityShared, inventoryAPIClient },
  } = useKibana();

  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;
  const {
    isEntityManagerEnabled,
    isEnablementLoading,
    refresh,
    showWelcomedModal,
    toggleWelcomedModal,
  } = useEntityManager();

  const handleSuccess = () => {
    refresh();
    toggleWelcomedModal();
  };

  const { value = { hasData: false }, loading: hasDataLoading } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/has_data', {
        signal,
      });
    },
    [inventoryAPIClient]
  );

  if (isEnablementLoading || hasDataLoading) {
    return (
      <ObservabilityPageTemplate
        pageHeader={{
          pageTitle,
        }}
      >
        <EuiEmptyPrompt icon={<EuiLoadingLogo logo="logoObservability" size="xl" />} />
      </ObservabilityPageTemplate>
    );
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle,
      }}
      noDataConfig={getEntityManagerEnablement({
        enabled: isEntityManagerEnabled,
        loading: isEnablementLoading,
        onSuccess: handleSuccess,
      })}
    >
      {value.hasData ? (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <SearchBar />
          </EuiFlexItem>
          <EuiFlexItem>
            {children}
            {showWelcomedModal ? (
              <Welcome onClose={toggleWelcomedModal} onConfirm={toggleWelcomedModal} />
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EmptyState />
      )}
    </ObservabilityPageTemplate>
  );
}
