/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSpacer, EuiLink } from '@elastic/eui';

import type { UsersKpiProps } from './types';

import { UsersKpiAuthentications } from './authentications';
import { TotalUsersKpi } from './total_users';
import { useUserRiskScore } from '../../../risk_score/containers';
import { CallOutSwitcher } from '../../../common/components/callouts';
import * as i18n from './translations';
import { RISKY_USERS_DOC_LINK } from '../constants';

export const UsersKpiComponent = React.memo<UsersKpiProps>(({ from, to, setQuery }) => {
  const [_, { isModuleEnabled }] = useUserRiskScore({});

  return (
    <>
      {isModuleEnabled === false && (
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
                  <EuiLink href={RISKY_USERS_DOC_LINK} target="_blank">
                    {i18n.USER_RISK_DATA}
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
          <TotalUsersKpi from={from} to={to} setQuery={setQuery} />
        </EuiFlexItem>

        <EuiFlexItem grow={2}>
          <UsersKpiAuthentications from={from} to={to} setQuery={setQuery} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

UsersKpiComponent.displayName = 'UsersKpiComponent';
