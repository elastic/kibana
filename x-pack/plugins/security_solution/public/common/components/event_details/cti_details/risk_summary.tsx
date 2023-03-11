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
import { RiskScore } from '../../../../explore/components/risk_score/severity/common';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import type { HostRisk, UserRisk } from '../../../../explore/containers/risk_score';
import { getEmptyValue } from '../../empty_value';
import { RiskScoreDocLink } from '../../../../explore/components/risk_score/risk_score_onboarding/risk_score_doc_link';
import { RiskScoreHeaderTitle } from '../../../../explore/components/risk_score/risk_score_onboarding/risk_score_header_title';

interface HostRiskEntity {
  originalRisk?: RiskSeverity | undefined;
  risk: HostRisk;
  riskEntity: RiskScoreEntity.host;
}

interface UserRiskEntity {
  originalRisk?: RiskSeverity | undefined;
  risk: UserRisk;
  riskEntity: RiskScoreEntity.user;
}

export type RiskEntity = HostRiskEntity | UserRiskEntity;

const RiskSummaryComponent: React.FC<RiskEntity> = ({ risk, riskEntity, originalRisk }) => {
  const currentRiskScore =
    riskEntity === RiskScoreEntity.host
      ? risk?.result?.[0]?.host?.risk?.calculated_level
      : risk?.result?.[0]?.user?.risk?.calculated_level;

  return (
    <>
      <EuiPanel hasBorder paddingSize="s" grow={false}>
        <ThreatSummaryPanelHeader
          title={
            <RiskScoreHeaderTitle
              title={i18n.RISK_DATA_TITLE(riskEntity)}
              riskScoreEntity={riskEntity}
            />
          }
          toolTipContent={
            <FormattedMessage
              id="xpack.securitySolution.alertDetails.overview.riskDataTooltipContent"
              defaultMessage="Risk classification is displayed only when available for a {riskEntity}. Ensure {riskScoreDocumentationLink} is enabled within your environment."
              values={{
                riskEntity,
                riskScoreDocumentationLink: (
                  <RiskScoreDocLink
                    riskScoreEntity={riskEntity}
                    title={i18n.RISK_SCORE_TITLE(riskEntity)}
                  />
                ),
              }}
            />
          }
        />

        {risk.loading && <EuiLoadingSpinner data-test-subj="loading" />}

        {!risk.loading && (
          <>
            <EnrichedDataRow
              field={i18n.CURRENT_RISK_CLASSIFICATION(riskEntity)}
              value={
                currentRiskScore ? (
                  <RiskScore severity={currentRiskScore} hideBackgroundColor />
                ) : (
                  getEmptyValue()
                )
              }
            />

            {originalRisk && currentRiskScore !== originalRisk && (
              <>
                <EnrichedDataRow
                  field={i18n.ORIGINAL_RISK_CLASSIFICATION(riskEntity)}
                  value={<RiskScore severity={originalRisk} hideBackgroundColor />}
                />
              </>
            )}
          </>
        )}
      </EuiPanel>
    </>
  );
};
export const RiskSummary = React.memo(RiskSummaryComponent);
