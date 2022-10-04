/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import type { UsersKpiProps } from './types';

import { UsersKpiAuthentications } from './authentications';
import { TotalUsersKpi } from './total_users';
import { CallOutSwitcher } from '../../../common/components/callouts';
import * as i18n from './translations';
import { RiskScoreDocLink } from '../../../common/components/risk_score/risk_score_onboarding/risk_score_doc_link';
import { getUserRiskIndex, RiskScoreEntity } from '../../../../common/search_strategy';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useRiskScoreFeatureStatus } from '../../../risk_score/containers/feature_status';

export const UsersKpiComponent = React.memo<UsersKpiProps>(
  ({ filterQuery, from, indexNames, to, setQuery, skip, updateDateRange }) => {
    const spaceId = useSpaceId();
    const defaultIndex = spaceId ? getUserRiskIndex(spaceId) : undefined;
    const { isEnabled, isLicenseValid, isLoading } = useRiskScoreFeatureStatus(
      RiskScoreEntity.user,
      defaultIndex
    );

    return (
      <>
        {isLicenseValid && !isEnabled && !isLoading && (
          <>
            <CallOutSwitcher
              namespace="users"
              condition
              message={{
                type: 'primary',
                id: 'userRiskModule',
                title: i18n.ENABLE_USER_RISK_TEXT,

                description: (
                  <>
                    {i18n.LEARN_MORE}{' '}
                    <RiskScoreDocLink
                      riskScoreEntity={RiskScoreEntity.user}
                      title={i18n.USER_RISK_DATA}
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
            <TotalUsersKpi from={from} to={to} setQuery={setQuery} />
          </EuiFlexItem>

          <EuiFlexItem grow={2}>
            <UsersKpiAuthentications from={from} to={to} setQuery={setQuery} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

UsersKpiComponent.displayName = 'UsersKpiComponent';
