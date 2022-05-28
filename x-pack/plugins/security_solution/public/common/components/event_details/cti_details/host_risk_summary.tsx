/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiPanel, EuiSpacer, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';
import { RISKY_HOSTS_DOC_LINK } from '../../../../overview/components/overview_risky_host_links/risky_hosts_disabled_module';
import { EnrichedDataRow, ThreatSummaryPanelHeader } from './threat_summary_view';
import { RiskScore } from '../../severity/common';
import { RiskSeverity } from '../../../../../common/search_strategy';
import { HostRisk } from '../../../../risk_score/containers';

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
            defaultMessage="Risk classification is displayed only when available for a host. Ensure {hostsRiskScoreDocumentationLink} is enabled within your environment."
            values={{
              hostsRiskScoreDocumentationLink: (
                <EuiLink href={RISKY_HOSTS_DOC_LINK} target="_blank">
                  <FormattedMessage
                    id="xpack.securitySolution.alertDetails.overview.hostsRiskScoreLink"
                    defaultMessage="Host Risk Score"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      />

      {hostRisk.loading && <EuiLoadingSpinner data-test-subj="loading" />}

      {!hostRisk.loading && (!hostRisk.isModuleEnabled || hostRisk.result?.length === 0) && (
        <>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="xs">
            {i18n.NO_HOST_RISK_DATA_DESCRIPTION}
          </EuiText>
        </>
      )}

      {hostRisk.isModuleEnabled && hostRisk.result && hostRisk.result.length > 0 && (
        <>
          <EnrichedDataRow
            field={'host.risk.keyword'}
            value={
              <RiskScore severity={hostRisk.result[0].risk as RiskSeverity} hideBackgroundColor />
            }
          />
        </>
      )}
    </EuiPanel>
  </>
);

export const HostRiskSummary = React.memo(HostRiskSummaryComponent);
