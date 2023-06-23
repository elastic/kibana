/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import {
  SecurityCellActions,
  CellActionsMode,
  SecurityCellActionsTrigger,
} from '../../../../common/components/cell_actions';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { HostDetailsLink } from '../../../../common/components/links';
import type { HostRiskScoreColumns } from '.';
import * as i18n from './translations';
import { HostsTableType } from '../../store/model';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreFields, RiskScoreEntity } from '../../../../../common/search_strategy';
import { RiskScore } from '../../../components/risk_score/severity/common';
import { ENTITY_RISK_CLASSIFICATION } from '../../../components/risk_score/translations';
import { CELL_ACTIONS_TELEMETRY } from '../../../components/risk_score/constants';

export const getHostRiskScoreColumns = ({
  dispatchSeverityUpdate,
}: {
  dispatchSeverityUpdate: (s: RiskSeverity) => void;
}): HostRiskScoreColumns => [
  {
    field: 'host.name',
    name: i18n.HOST_NAME,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (hostName) => {
      if (hostName != null && hostName.length > 0) {
        return (
          <SecurityCellActions
            mode={CellActionsMode.HOVER_DOWN}
            visibleCellActions={5}
            showActionTooltips
            triggerId={SecurityCellActionsTrigger.DEFAULT}
            data={{
              value: hostName,
              field: 'host.name',
            }}
            metadata={{
              telemetry: CELL_ACTIONS_TELEMETRY,
            }}
          >
            <HostDetailsLink hostName={hostName} hostTab={HostsTableType.risk} />
          </SecurityCellActions>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: RiskScoreFields.hostRiskScore,
    name: i18n.HOST_RISK_SCORE,
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
    field: RiskScoreFields.hostRisk,
    name: (
      <EuiToolTip content={i18n.HOST_RISK_TOOLTIP}>
        <>
          {ENTITY_RISK_CLASSIFICATION(RiskScoreEntity.host)}{' '}
          <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
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
                <EuiText size="xs">{i18n.VIEW_HOSTS_BY_SEVERITY(risk.toLowerCase())}</EuiText>
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
