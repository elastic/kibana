/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import { HostsKpiHosts } from './hosts';
import { HostsKpiUniqueIps } from './unique_ips';
import type { HostsKpiProps } from './types';
import { CallOutSwitcher } from '../../../common/components/callouts';
import * as i18n from './translations';
import { RiskScoreDocLink } from '../../../risk_score/components/risk_score_onboarding/risk_score_doc_link';
import { getHostRiskIndex, RiskScoreEntity } from '../../../../common/search_strategy';
import { useRiskScoreFeatureStatus } from '../../../risk_score/containers/feature_status';
import { useSpaceId } from '../../../common/hooks/use_space_id';

export const HostsKpiComponent = React.memo<HostsKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, updateDateRange }) => {
    const spaceId = useSpaceId();
    const defaultIndex = spaceId ? getHostRiskIndex(spaceId) : undefined;
    const { isEnabled, isLicenseValid, isLoading } = useRiskScoreFeatureStatus(
      RiskScoreEntity.host,
      defaultIndex
    );

    return (
      <>
        {isLicenseValid && !isEnabled && !isLoading && (
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
                    <RiskScoreDocLink
                      riskScoreEntity={RiskScoreEntity.host}
                      title={i18n.HOST_RISK_DATA}
                    />
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
              updateDateRange={updateDateRange}
              setQuery={setQuery}
              skip={skip}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <HostsKpiUniqueIps
              filterQuery={filterQuery}
              from={from}
              indexNames={indexNames}
              to={to}
              updateDateRange={updateDateRange}
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
  ({ filterQuery, from, indexNames, to, setQuery, skip, updateDateRange }) => {
    return (
      <EuiFlexGroup wrap>
        <EuiFlexItem grow={1}>
          <HostsKpiUniqueIps
            filterQuery={filterQuery}
            from={from}
            indexNames={indexNames}
            to={to}
            updateDateRange={updateDateRange}
            setQuery={setQuery}
            skip={skip}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

HostsDetailsKpiComponent.displayName = 'HostsDetailsKpiComponent';
