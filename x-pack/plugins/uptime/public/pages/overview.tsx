/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { ComponentType, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { useGetUrlParams } from '../hooks';
import { IIndexPattern, StatefulSearchBarProps } from '../../../../../src/plugins/data/public';
import { useUpdateKueryString } from '../hooks';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { useTrackPageview } from '../../../observability/public';
import { MonitorList } from '../components/overview/monitor_list/monitor_list_container';
import { EmptyState, FilterGroup, KueryBar, ParsingErrorCallout } from '../components/overview';
import { StatusPanel } from '../components/overview/status_panel';
import { getConnectorsAction, getMonitorAlertsAction } from '../state/alerts/alerts';
import { useInitApp } from '../hooks/use_init_app';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { UptimeStartupPluginsContext } from '../contexts';
import { useIndexPattern } from '../components/overview/kuery_bar/use_index_pattern';

interface Props {
  loading: boolean;
  indexPattern: IIndexPattern | null;
  setEsKueryFilters: (esFilters: string) => void;
}

const EuiFlexItemStyled = styled(EuiFlexItem)`
  && {
    min-width: 598px;
    @media only screen and (max-width: 1128px) {
      min-width: 500px;
    }
    @media only screen and (max-width: 630px) {
      min-width: initial;
    }
  }
`;

export const OverviewPageComponent = React.memo(({ setEsKueryFilters, loading }: Props) => {
  const { absoluteDateRangeStart, absoluteDateRangeEnd, ...params } = useGetUrlParams();
  const { search, filters: urlFilters } = params;

  useTrackPageview({ app: 'uptime', path: 'overview' });
  useTrackPageview({ app: 'uptime', path: 'overview', delay: 15000 });

  useInitApp();

  const { index_pattern: indexPattern } = useIndexPattern();

  const [esFilters, error] = useUpdateKueryString(indexPattern, search, urlFilters);

  useEffect(() => {
    setEsKueryFilters(esFilters ?? '');
  }, [esFilters, setEsKueryFilters]);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getConnectorsAction.get());
    dispatch(getMonitorAlertsAction.get());
  }, [dispatch]);

  useBreadcrumbs([]); // No extra breadcrumbs on overview

  const {
    data: { ui },
  } = useContext(UptimeStartupPluginsContext);

  const SearchBar: ComponentType<StatefulSearchBarProps> = ui.SearchBar;

  return (
    <>
      <EmptyState>
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          <EuiFlexItem grow={1} style={{ flexBasis: 485 }}>
            <SearchBar
              appName="uptime"
              showQueryBar={true}
              showQueryInput={true}
              useDefaultBehaviors={true}
              indexPatterns={indexPattern ? [indexPattern] : []}
              showFilterBar={false}
              showDatePicker={false}
              nonKqlMode={'text'}
              nonKqlModeHelpText={'Uptime uses simple text search.'}
              onQueryChange={(payload) => {}}
              onQuerySubmit={(payload) => {}}
            />
          </EuiFlexItem>
          <EuiFlexItemStyled grow={true}>
            <FilterGroup esFilters={esFilters} />
          </EuiFlexItemStyled>
          {error && !loading && <ParsingErrorCallout error={error} />}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <StatusPanel />
        <EuiSpacer size="s" />
        <MonitorList filters={esFilters} />
      </EmptyState>
    </>
  );
});
