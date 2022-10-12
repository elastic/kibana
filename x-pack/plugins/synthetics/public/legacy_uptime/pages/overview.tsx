/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { useTrackPageview } from '@kbn/observability-plugin/public';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { MonitorList } from '../components/overview/monitor_list/monitor_list_container';
import { ZipUrlDeprecation } from '../components/overview/zip_url_deprecation';
import { StatusPanel } from '../components/overview/status_panel';
import { QueryBar } from '../components/overview/query_bar/query_bar';
import { MONITORING_OVERVIEW_LABEL } from '../routes';
import { FilterGroup } from '../components/overview/filter_group/filter_group';

const EuiFlexItemStyled = styled(EuiFlexItem)`
  && {
    min-width: 800px;
    @media only screen and (max-width: 1128px) {
      min-width: 500px;
    }
    @media only screen and (max-width: 630px) {
      min-width: initial;
    }
  }
`;

export const OverviewPageComponent = () => {
  useTrackPageview({ app: 'uptime', path: 'overview' });
  useTrackPageview({ app: 'uptime', path: 'overview', delay: 15000 });

  useBreadcrumbs([{ text: MONITORING_OVERVIEW_LABEL }]); // No extra breadcrumbs on overview

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={true}>
          <ZipUrlDeprecation />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            <QueryBar />
            <EuiFlexItemStyled grow={true}>
              <FilterGroup />
            </EuiFlexItemStyled>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <StatusPanel />
      <EuiSpacer size="s" />
      <MonitorList />
    </>
  );
};
