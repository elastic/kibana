/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import {
  SecurityCellActions,
  CellActionsMode,
  SecurityCellActionsTrigger,
} from '../../../common/components/cell_actions';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { HostDetailsLink } from '../../../common/components/links';
import type { HostRiskScoreColumns } from '.';
import * as i18n from './translations';
import { HostsTableType } from '../../../explore/hosts/store/model';
import type { Maybe, RiskSeverity } from '../../../../common/search_strategy';
import { RiskScoreFields, RiskScoreEntity } from '../../../../common/search_strategy';
import { RiskScoreLevel } from '../severity/common';
import { ENTITY_RISK_LEVEL } from '../risk_score/translations';
import { CELL_ACTIONS_TELEMETRY } from '../risk_score/constants';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { formatRiskScore } from '../../common';

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
    width: '35%',
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
    field: RiskScoreFields.timestamp,
    name: i18n.LAST_UPDATED,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (lastSeen: Maybe<string>) => {
      if (lastSeen != null) {
        return <FormattedRelativePreferenceDate value={lastSeen} />;
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
            {formatRiskScore(riskScore)}
          </span>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: RiskScoreFields.hostRisk,
    name: ENTITY_RISK_LEVEL(RiskScoreEntity.host),
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (risk) => {
      if (risk != null) {
        return (
          <RiskScoreLevel
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
