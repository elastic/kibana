/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiLoadingSpinner } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { Filter } from '@kbn/es-query';
import { AlertsSearchBar } from '@kbn/alerts-ui-shared';
import { PLUGIN } from '../../../../common/constants/plugin';
import { useKibana } from '../../../utils/kibana_react';

export interface MaintenanceWindowScopedQueryProps {
  featureIds: AlertConsumers[];
  query: string;
  filters: Filter[];
  errors?: string[];
  isLoading?: boolean;
  isEnabled?: boolean;
  onQueryChange: (query: string) => void;
  onFiltersChange: (filters: Filter[]) => void;
}

export const MaintenanceWindowScopedQuery = React.memo(
  (props: MaintenanceWindowScopedQueryProps) => {
    const {
      featureIds,
      query,
      filters,
      errors = [],
      isLoading,
      isEnabled = true,
      onQueryChange,
      onFiltersChange,
    } = props;

    const {
      http,
      data,
      notifications: { toasts },
      unifiedSearch: {
        ui: { SearchBar },
      },
    } = useKibana().services;

    const onQueryChangeInternal = useCallback(
      ({ query: newQuery }: { query?: string }) => {
        onQueryChange(newQuery || '');
      },
      [onQueryChange]
    );

    if (isLoading) {
      return (
        <EuiFlexGroup
          justifyContent="spaceAround"
          data-test-subj="maintenanceWindowScopedQueryLoading"
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (!isEnabled) {
      return null;
    }

    return (
      <EuiFlexGroup data-test-subj="maintenanceWindowScopeQuery" direction="column">
        <EuiFlexItem>
          <EuiFormRow fullWidth isInvalid={errors.length !== 0} error={errors[0]}>
            <AlertsSearchBar
              appName={PLUGIN.getI18nName(i18n)}
              featureIds={featureIds}
              disableQueryLanguageSwitcher={true}
              query={query}
              filters={filters}
              onQueryChange={onQueryChangeInternal}
              onQuerySubmit={onQueryChangeInternal}
              onFiltersUpdated={onFiltersChange}
              showFilterBar
              submitOnBlur
              showDatePicker={false}
              showSubmitButton={false}
              http={http}
              toasts={toasts}
              unifiedSearchBar={SearchBar}
              dataService={data}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
