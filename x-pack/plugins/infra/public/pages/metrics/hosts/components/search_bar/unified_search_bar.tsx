/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { EuiFlexGrid, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { EuiHorizontalRule } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import type { InfraClientStartDeps } from '../../../../../types';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { ControlsContent } from './controls_content';
import { useMetricsDataViewContext } from '../../hooks/use_data_view';
import { LimitOptions } from './limit_options';
import { HostLimitOptions } from '../../types';

export const UnifiedSearchBar = () => {
  const {
    services: { unifiedSearch, application },
  } = useKibana<InfraClientStartDeps>();
  const { dataView } = useMetricsDataViewContext();
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();

  const { SearchBar } = unifiedSearch.ui;

  const onPanelFiltersChange = (panelFilters: Filter[]) => {
    onQueryChange({ panelFilters });
  };

  const onLimitChange = (limit: number) => {
    onQueryChange({ limit });
  };

  const onQueryChange = ({
    payload,
    panelFilters,
    limit,
  }: {
    payload?: { dateRange: TimeRange; query?: Query };
    panelFilters?: Filter[];
    limit?: number;
  }) => {
    onSubmit({ query: payload?.query, dateRange: payload?.dateRange, panelFilters, limit });
  };

  const handleRefresh = (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => {
    // This makes sure `onQueryChange` is only called when the submit button is clicked
    if (isUpdate === false) {
      onQueryChange({ payload });
    }
  };

  return (
    <StickyContainer>
      <SearchBar
        appName={'Infra Hosts'}
        displayStyle="inPage"
        indexPatterns={dataView && [dataView]}
        placeholder={i18n.translate('xpack.infra.hosts.searchPlaceholder', {
          defaultMessage: 'Search hosts (E.g. cloud.provider:gcp AND system.load.1 > 0.5)',
        })}
        onQuerySubmit={handleRefresh}
        showSaveQuery={Boolean(application?.capabilities?.visualize?.saveQuery)}
        showDatePicker
        showFilterBar
        showQueryInput
        showQueryMenu
        useDefaultBehaviors
      />
      <EuiFlexGroup direction="row" alignItems="center">
        <EuiFlexItem>
          <ControlsContent
            timeRange={searchCriteria.dateRange}
            dataView={dataView}
            query={searchCriteria.query}
            filters={searchCriteria.filters}
            selectedOptions={searchCriteria.panelFilters}
            onFiltersChange={onPanelFiltersChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LimitOptions limit={searchCriteria.limit as HostLimitOptions} onChange={onLimitChange} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="none" />
    </StickyContainer>
  );
};

const StickyContainer = (props: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGrid
      gutterSize="none"
      css={css`
        position: sticky;
        top: calc(${euiTheme.size.xxxl} * 2);
        z-index: ${euiTheme.levels.header};
        background: ${euiTheme.colors.emptyShade};
        padding-top: ${euiTheme.size.m};
        margin-top: -${euiTheme.size.l};
      `}
      {...props}
    />
  );
};
