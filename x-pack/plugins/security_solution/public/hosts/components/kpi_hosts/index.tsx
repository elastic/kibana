/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSpacer, EuiLink } from '@elastic/eui';

import { HostsKpiAuthentications } from './authentications';
import { HostsKpiHosts } from './hosts';
import { HostsKpiUniqueIps } from './unique_ips';
import { HostsKpiProps } from './types';
import { RiskyHosts } from './risky_hosts';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useRiskyHosts } from '../../containers/kpi_hosts/risky_hosts';
import { CallOutSwitcher } from '../../../common/components/callouts';
import { ExploratoryCharts } from '../../../common/components/stat_items/exploratory_charts';
import { RISKY_HOSTS_DOC_LINK } from '../../../overview/components/overview_risky_host_links/risky_hosts_disabled_module';
import * as i18n from './translations';

export const HostsKpiComponent = React.memo<HostsKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, narrowDateRange }) => {
    const riskyHostsExperimentEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');
    const {
      error,
      response,
      loading,
      isModuleDisabled: isRiskHostsModuleDisabled,
    } = useRiskyHosts({
      filterQuery,
      from,
      to,
      skip: skip || !riskyHostsExperimentEnabled,
    });

    return (
      <>
        {isRiskHostsModuleDisabled && (
          <>
            <CallOutSwitcher
              namespace="hosts"
              condition
              message={{
                type: 'primary',
                id: 'hostRiskModule',
                title: i18n.ENABLE_HOST_RISK_TEXT,
                description: (
                  <>
                    {i18n.LEARN_MORE}{' '}
                    <EuiLink href={RISKY_HOSTS_DOC_LINK} target="_blank">
                      {i18n.HOST_RISK_DATA}
                    </EuiLink>
                    <EuiSpacer />
                  </>
                ),
              }}
            />
            <EuiSpacer size="l" />
          </>
        )}

        <EuiFlexGroup wrap>
          <EuiFlexItem grow={riskyHostsExperimentEnabled ? 1 : 2}>
            <HostsKpiHosts
              filterQuery={filterQuery}
              from={from}
              indexNames={indexNames}
              to={to}
              narrowDateRange={narrowDateRange}
              setQuery={setQuery}
              skip={skip}
            />
          </EuiFlexItem>
          {riskyHostsExperimentEnabled && (
            <EuiFlexItem grow={1}>
              <RiskyHosts
                error={isRiskHostsModuleDisabled ? undefined : error}
                data={response}
                loading={loading}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={2}>
            <HostsKpiUniqueIps
              filterQuery={filterQuery}
              from={from}
              indexNames={indexNames}
              to={to}
              narrowDateRange={narrowDateRange}
              setQuery={setQuery}
              skip={skip}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <ExploratoryCharts from={from} to={to} indexNames={indexNames} />
      </>
    );
  }
);

HostsKpiComponent.displayName = 'HostsKpiComponent';

export const HostsDetailsKpiComponent = React.memo<HostsKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, narrowDateRange }) => (
    <EuiFlexGroup wrap>
      <EuiFlexItem grow={1}>
        <HostsKpiAuthentications
          filterQuery={filterQuery}
          from={from}
          indexNames={indexNames}
          to={to}
          narrowDateRange={narrowDateRange}
          setQuery={setQuery}
          skip={skip}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <HostsKpiUniqueIps
          filterQuery={filterQuery}
          from={from}
          indexNames={indexNames}
          to={to}
          narrowDateRange={narrowDateRange}
          setQuery={setQuery}
          skip={skip}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

HostsDetailsKpiComponent.displayName = 'HostsDetailsKpiComponent';
