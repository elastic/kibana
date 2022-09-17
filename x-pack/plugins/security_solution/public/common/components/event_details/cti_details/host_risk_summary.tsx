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
import type { HostRisk } from '../../../../risk_score/containers';
import { getEmptyValue } from '../../empty_value';
import { RiskScoreDocLink } from '../../risk_score/risk_score_onboarding/risk_score_doc_link';
import { RiskScoreEntity } from '../../../../../common/search_strategy';

const HostRiskSummaryComponent: React.FC<{
  hostRisk: HostRisk;
}> = ({ hostRisk }) => (
  <>
    <EuiPanel hasBorder paddingSize="s" grow={false}>
      <ThreatSummaryPanelHeader
        title={i18n.HOST_RISK_DATA_TITLE}
        toolTipContent={
          <FormattedMessage
            id="xpack.securitySolution.alertDetails.overview.hostDataTooltipContent"
            defaultMessage="Risk classification is displayed only when available for a host. Ensure {hostRiskScoreDocumentationLink} is enabled within your environment."
            values={{
              hostRiskScoreDocumentationLink: (
                <RiskScoreDocLink
                  external={true}
                  riskScoreEntity={RiskScoreEntity.host}
                  title={
                    <FormattedMessage
                      id="xpack.securitySolution.alertDetails.overview.hostRiskScoreLink"
                      defaultMessage="Host Risk Score"
                    />
                  }
                />
              ),
            }}
          />
        }
      />

      {hostRisk.loading && <EuiLoadingSpinner data-test-subj="loading" />}

      {!hostRisk.loading && (
        <>
          <EnrichedDataRow
            field={i18n.HOST_RISK_CLASSIFICATION}
            value={
              hostRisk.result && hostRisk.result.length > 0 ? (
                <RiskScore
                  severity={hostRisk.result[0].host.risk.calculated_level}
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

export const HostRiskSummary = React.memo(HostRiskSummaryComponent);
