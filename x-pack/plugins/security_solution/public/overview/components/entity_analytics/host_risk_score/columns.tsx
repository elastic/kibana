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
import { HostDetailsLink } from '../../../../common/components/links';
import { HostsTableType } from '../../../../hosts/store/model';
import { RiskScore } from '../../../../common/components/severity/common';
import type { HostRiskScore, RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreFields } from '../../../../../common/search_strategy';
import * as i18n from './translations';

type HostRiskScoreColumns = Array<EuiBasicTableColumn<HostRiskScore>>;

export const getHostRiskScoreColumns = (): HostRiskScoreColumns => [
  {
    field: 'host.name',
    name: i18n.HOST_NAME,
    truncateText: false,
    mobileOptions: { show: true },
    render: (hostName: string) => {
      if (hostName != null && hostName.length > 0) {
        return <HostDetailsLink hostName={hostName} hostTab={HostsTableType.risk} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: RiskScoreFields.hostRiskScore,
    name: i18n.HOST_RISK_SCORE,
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
    field: RiskScoreFields.hostRisk,
    name: (
      <EuiToolTip content={i18n.HOST_RISK_TOOLTIP}>
        <>
          {i18n.HOST_RISK}
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
