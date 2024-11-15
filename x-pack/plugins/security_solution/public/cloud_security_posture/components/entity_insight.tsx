/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiHorizontalRule, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';

import React from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { MisconfigurationsPreview } from './misconfiguration/misconfiguration_preview';
import { VulnerabilitiesPreview } from './vulnerabilities/vulnerabilities_preview';
import { AlertsPreview } from './alerts/alerts_preview';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../overview/components/detection_response/alerts_by_status/types';
import { useNonClosedAlerts } from '../hooks/use_non_closed_alerts';

export const EntityInsight = <T,>({
  name,
  fieldName,
  isPreviewMode,
}: {
  name: string;
  fieldName: 'host.name' | 'user.name';
  isPreviewMode?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const insightContent: React.ReactElement[] = [];

  const { hasMisconfigurationFindings } = useHasMisconfigurations(fieldName, name);

  const { hasVulnerabilitiesFindings } = useHasVulnerabilities(fieldName, name);

  const isVulnerabilitiesFindingForHost = hasVulnerabilitiesFindings && fieldName === 'host.name';

  const { to, from } = useGlobalTime();

  const { hasNonClosedAlerts, filteredAlertsData } = useNonClosedAlerts({
    fieldName,
    queryName: name,
    to,
    from,
    queryId: DETECTION_RESPONSE_ALERTS_BY_STATUS_ID,
  });

  if (hasNonClosedAlerts) {
    insightContent.push(
      <>
        <AlertsPreview
          alertsData={filteredAlertsData}
          fieldName={fieldName}
          name={name}
          isPreviewMode={isPreviewMode}
        />
        <EuiSpacer size="s" />
      </>
    );
  }

  if (hasMisconfigurationFindings)
    insightContent.push(
      <>
        <MisconfigurationsPreview
          name={name}
          fieldName={fieldName}
          hasNonClosedAlerts={hasNonClosedAlerts}
          isPreviewMode={isPreviewMode}
        />
        <EuiSpacer size="s" />
      </>
    );
  if (isVulnerabilitiesFindingForHost && hasVulnerabilitiesFindings)
    insightContent.push(
      <>
        <VulnerabilitiesPreview
          name={name}
          isPreviewMode={isPreviewMode}
          hasNonClosedAlerts={hasNonClosedAlerts}
        />
        <EuiSpacer size="s" />
      </>
    );
  return (
    <>
      {(insightContent.length > 0 ||
        hasMisconfigurationFindings ||
        (isVulnerabilitiesFindingForHost && hasVulnerabilitiesFindings)) && (
        <>
          <EuiAccordion
            initialIsOpen={true}
            id="entityInsight-accordion"
            data-test-subj="entityInsightTestSubj"
            buttonProps={{
              'data-test-subj': 'entityInsight-accordion-button',
              css: css`
                color: ${euiTheme.colors.primary};
              `,
            }}
            buttonContent={
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.insightsTitle"
                    defaultMessage="Insights"
                  />
                </h3>
              </EuiTitle>
            }
          >
            <EuiSpacer size="m" />
            {insightContent}
          </EuiAccordion>
          <EuiHorizontalRule />
        </>
      )}
    </>
  );
};
