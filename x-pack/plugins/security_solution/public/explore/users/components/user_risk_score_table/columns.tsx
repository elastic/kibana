/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import type { UserRiskScoreColumns } from '.';
import * as i18n from './translations';
import { RiskScore } from '../../../components/risk_score/severity/common';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreFields } from '../../../../../common/search_strategy';
import { UserDetailsLink } from '../../../../common/components/links';
import { UsersTableType } from '../../store/model';
import { getRowItemsWithActions } from '../../../../common/components/tables/helpers';

export const getUserRiskScoreColumns = ({
  dispatchSeverityUpdate,
}: {
  dispatchSeverityUpdate: (s: RiskSeverity) => void;
}): UserRiskScoreColumns => [
  {
    field: 'user.name',
    name: i18n.USER_NAME,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (userName) => {
      if (userName != null && userName.length > 0) {
        const id = escapeDataProviderId(`user-risk-score-table-userName-${userName}`);
        return getRowItemsWithActions({
          values: [userName],
          fieldName: 'user.name',
          render: (item) => <UserDetailsLink userName={item} userTab={UsersTableType.risk} />,
          idPrefix: id,
          fieldType: 'keyword',
        });
      }
      return getEmptyTagValue();
    },
  },
  {
    field: RiskScoreFields.userRiskScore,
    name: i18n.USER_RISK_SCORE,
    truncateText: true,
    mobileOptions: { show: true },
    sortable: true,
    render: (riskScore) => {
      if (riskScore != null) {
        return (
          <span data-test-subj="risk-score-truncate" title={`${riskScore}`}>
            {Math.round(riskScore)}
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
          {i18n.USER_RISK} <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
        </>
      </EuiToolTip>
    ),
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (risk) => {
      if (risk != null) {
        return (
          <RiskScore
            toolTipContent={
              <EuiLink onClick={() => dispatchSeverityUpdate(risk)}>
                <EuiText size="xs">{i18n.VIEW_USERS_BY_SEVERITY(risk.toLowerCase())}</EuiText>
              </EuiLink>
            }
            severity={risk}
          />
        );
      }
      return getEmptyTagValue();
    },
  },
];
