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
import { CallOutSwitcher } from '../../../common/components/callouts';
import { RISKY_HOSTS_DOC_LINK } from '../../../overview/components/overview_risky_host_links/risky_hosts_disabled_module';
import * as i18n from './translations';
import { useHostRiskScore } from '../../../risk_score/containers';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

export const HostsKpiComponent = React.memo<HostsKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, narrowDateRange }) => {
    const [_, { isModuleEnabled }] = useHostRiskScore({});
    const usersEnabled = useIsExperimentalFeatureEnabled('usersEnabled');

    return (
      <>
        {isModuleEnabled === false && (
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
          <EuiFlexItem grow={1}>
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
          {!usersEnabled && (
            <EuiFlexItem grow={2}>
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
      </>
    );
  }
);

HostsKpiComponent.displayName = 'HostsKpiComponent';

export const HostsDetailsKpiComponent = React.memo<HostsKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, narrowDateRange }) => {
    const usersEnabled = useIsExperimentalFeatureEnabled('usersEnabled');
    return (
      <EuiFlexGroup wrap>
        {!usersEnabled && (
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
        )}
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
    );
  }
);

HostsDetailsKpiComponent.displayName = 'HostsDetailsKpiComponent';
