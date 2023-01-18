/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import type { RawBucket } from '../../../common/components/grouping_table/types';
import * as i18n from './translations';

export const StatsContainer = styled.span`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  border-right: ${({ theme }) => theme.eui.euiBorderThin};
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
  padding-right: ${({ theme }) => theme.eui.euiSizeM};
`;

export const getExtraActions = (bucket: RawBucket) => {
  const defaultActions = (
    <EuiFlexGroup key={`stats-${bucket.key[0]}`} gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <StatsContainer>
          <>
            {i18n.STATS_GROUP_USERS}
            <EuiBadge color="hollow" style={{ marginLeft: 10 }}>
              {bucket.usersCountAggregation?.value}
            </EuiBadge>
          </>
        </StatsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StatsContainer>
          <>
            {i18n.STATS_GROUP_HOSTS}
            <EuiBadge color="hollow" style={{ marginLeft: 10 }}>
              {bucket.hostsCountAggregation?.value}
            </EuiBadge>
          </>
        </StatsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StatsContainer>
          <>
            {i18n.STATS_GROUP_ALERTS}
            <EuiBadge style={{ marginLeft: 10 }} color="#a83632">
              {bucket.alertsCount?.value}
            </EuiBadge>
          </>
        </StatsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={() => window.alert('Button clicked')}
          iconType="arrowDown"
          iconSide="right"
        >
          {i18n.TAKE_ACTION}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  return defaultActions;
};
