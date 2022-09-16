/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiPanel, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';
import { EnrichedDataRow, ThreatSummaryPanelHeader } from './threat_summary_view';
import { RiskScore } from '../../severity/common';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import type { UserRisk } from '../../../../risk_score/containers';
import { getEmptyValue } from '../../empty_value';
import { RISKY_USERS_DOC_LINK } from '../../../../users/components/constants';

const UserRiskSummaryComponent: React.FC<{
  userRisk: UserRisk;
}> = ({ userRisk }) => (
  <>
    <EuiPanel hasBorder paddingSize="s" grow={false}>
      <ThreatSummaryPanelHeader
        title={i18n.USER_RISK_DATA_TITLE}
        toolTipContent={
          <FormattedMessage
            id="xpack.securitySolution.alertDetails.overview.userDataTooltipContent"
            defaultMessage="Risk classification is displayed only when available for a user. Ensure {userRiskScoreDocumentationLink} is enabled within your environment."
            values={{
              userRiskScoreDocumentationLink: (
                <EuiLink href={RISKY_USERS_DOC_LINK} target="_blank">
                  <FormattedMessage
                    id="xpack.securitySolution.alertDetails.overview.userRiskScoreLink"
                    defaultMessage="User Risk Score"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      />

      {userRisk.loading && <EuiLoadingSpinner data-test-subj="loading" />}

      {!userRisk.loading && (
        <>
          <EnrichedDataRow
            field={i18n.USER_RISK_CLASSIFICATION}
            value={
              userRisk.result && userRisk.result.length > 0 ? (
                <RiskScore
                  severity={userRisk.result[0].user.risk.calculated_level as RiskSeverity}
                  hideBackgroundColor
                />
              ) : (
                getEmptyValue()
              )
            }
          />
        </>
      )}
    </EuiPanel>
  </>
);

export const UserRiskSummary = React.memo(UserRiskSummaryComponent);
