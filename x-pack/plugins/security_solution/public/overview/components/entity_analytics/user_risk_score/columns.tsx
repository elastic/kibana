/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { RiskScore } from '../../../../common/components/severity/common';
import * as i18n from './translations';
import { UsersTableType } from '../../../../users/store/model';
import type { RiskSeverity, UserRiskScore } from '../../../../../common/search_strategy';
import { RiskScoreFields } from '../../../../../common/search_strategy';
import { UserDetailsLink } from '../../../../common/components/links';

type UserRiskScoreColumns = Array<EuiBasicTableColumn<UserRiskScore>>;

export const getUserRiskScoreColumns = (): UserRiskScoreColumns => [
  {
    field: 'user.name',
    name: i18n.USER_NAME,
    truncateText: false,
    mobileOptions: { show: true },
    render: (userName: string) => {
      if (userName != null && userName.length > 0) {
        return <UserDetailsLink userName={userName} userTab={UsersTableType.risk} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: RiskScoreFields.userRiskScore,
    name: i18n.USER_RISK_SCORE,
    truncateText: true,
    mobileOptions: { show: true },
    render: (riskScore: number) => {
      if (riskScore != null) {
        return (
          <span data-test-subj="risk-score-truncate" title={`${riskScore}`}>
            {riskScore.toFixed(2)}
          </span>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: RiskScoreFields.userRisk,
    name: (
      <EuiToolTip content={i18n.USER_RISK_TOOLTIP}>
        <>
          {i18n.USER_RISK}
          <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
        </>
      </EuiToolTip>
    ),
    truncateText: false,
    mobileOptions: { show: true },
    render: (risk: RiskSeverity) => {
      if (risk != null) {
        return <RiskScore severity={risk} />;
      }
      return getEmptyTagValue();
    },
  },
];
