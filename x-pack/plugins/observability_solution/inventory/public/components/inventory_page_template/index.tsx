/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { SearchBar } from '../search_bar';
import { getEntityManagerEnablement } from './no_data_config';
import { useEntityManager } from '../../hooks/use_entity_manager';
import { Welcome } from '../entity_enablement/welcome_modal';

export function InventoryPageTemplate({ children }: { children: React.ReactNode }) {
  const {
    services: { observabilityShared },
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

  return (
    <ObservabilityPageTemplate
      noDataConfig={getEntityManagerEnablement({
        enabled: isEntityManagerEnabled,
        loading: isEnablementLoading,
        onSuccess: handleSuccess,
      })}
      pageHeader={{
        pageTitle: i18n.translate('xpack.inventory.inventoryPageHeaderLabel', {
          defaultMessage: 'Inventory',
        }),
      }}
    >
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
    </ObservabilityPageTemplate>
  );
}
