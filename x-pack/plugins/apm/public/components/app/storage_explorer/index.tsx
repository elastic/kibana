/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexLifecyclePhaseSelect } from './index_lifecycle_phase_select';
import { ServicesTable } from './services_table';
import { SearchBar } from '../../shared/search_bar';
import { StorageChart } from './storage_chart';
import { PermissionDenied } from './prompts/permission_denied';
import { useFetcher, FETCH_STATUS } from '../../../hooks/use_fetcher';
import { SummaryStats } from './summary_stats';
import { ApmEnvironmentFilter } from '../../shared/environment_filter';

const INITIAL_DATA = { hasPrivileges: false };

export function StorageExplorer() {
  const { data: { hasPrivileges } = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/storage_explorer/privileges');
    },
    []
  );

  const loading = status === FETCH_STATUS.LOADING;

  if (loading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingSpinner size="xl" />}
        titleSize="xs"
        title={
          <h2>
            {i18n.translate('xpack.apm.storageExplorer.loadingPromptTitle', {
              defaultMessage: 'Loading Storage Explorer...',
            })}
          </h2>
        }
      />
    );
  }

  if (!hasPrivileges) {
    return <PermissionDenied />;
  }

  return (
    <>
      <SearchBar />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <ApmEnvironmentFilter />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <IndexLifecyclePhaseSelect />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <SummaryStats />
      <EuiSpacer />
      <StorageChart />
      <EuiSpacer />
      <ServicesTable />
    </>
  );
}
