/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';
import { EnrichedDataRow, ThreatSummaryPanelHeader } from './threat_summary_view';
import { RiskScore } from '../../severity/common';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import type { UserRisk } from '../../../../risk_score/containers';
import { getEmptyValue } from '../../empty_value';
import { RiskScoreDocLink } from '../../risk_score/risk_score_onboarding/risk_score_doc_link';
import { RiskScoreHeaderTitle } from '../../risk_score/risk_score_onboarding/risk_score_header_title';

const UserRiskSummaryComponent: React.FC<{
  userRisk: UserRisk;
  originalUserRisk?: RiskSeverity | undefined;
}> = ({ userRisk, originalUserRisk }) => {
  const currentUserRiskScore = userRisk?.result?.[0]?.user?.risk?.calculated_level;
  return (
    <>
      <EuiPanel hasBorder paddingSize="s" grow={false}>
        <ThreatSummaryPanelHeader
          title={
            <RiskScoreHeaderTitle
              title={i18n.USER_RISK_DATA_TITLE}
              riskScoreEntity={RiskScoreEntity.user}
              showTooltip={false}
            />
          }
          toolTipContent={
            <FormattedMessage
              id="xpack.securitySolution.alertDetails.overview.userDataTooltipContent"
              defaultMessage="Risk classification is displayed only when available for a user. Ensure {userRiskScoreDocumentationLink} is enabled within your environment."
              values={{
                userRiskScoreDocumentationLink: (
                  <RiskScoreDocLink
                    riskScoreEntity={RiskScoreEntity.user}
                    title={
                      <FormattedMessage
                        id="xpack.securitySolution.alertDetails.overview.userRiskScoreLink"
                        defaultMessage="User Risk Score"
                      />
                    }
                  />
                ),
              }}
            />
          }
        />

        {userRisk.loading && <EuiLoadingSpinner data-test-subj="loading" />}

        {!userRisk.loading && (
          <>
            <EnrichedDataRow
              field={i18n.CURRENT_USER_RISK_CLASSIFICATION}
              value={
                currentUserRiskScore ? (
                  <RiskScore severity={currentUserRiskScore as RiskSeverity} hideBackgroundColor />
                ) : (
                  getEmptyValue()
                )
              }
            />
            {originalUserRisk && currentUserRiskScore !== originalUserRisk && (
              <>
                <EnrichedDataRow
                  field={i18n.ORIGINAL_USER_RISK_CLASSIFICATION}
                  value={<RiskScore severity={originalUserRisk} hideBackgroundColor />}
                />
              </>
            )}
          </>
        )}
      </EuiPanel>
    </>
  );
};
export const UserRiskSummary = React.memo(UserRiskSummaryComponent);
