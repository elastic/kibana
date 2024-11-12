/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiHorizontalRule, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { hasVulnerabilitiesData } from '@kbn/cloud-security-posture';
import { MisconfigurationsPreview } from './misconfiguration/misconfiguration_preview';
import { VulnerabilitiesPreview } from './vulnerabilities/vulnerabilities_preview';
import { AlertsPreview } from './alerts/alerts_preview';
import { useGlobalTime } from '../../common/containers/use_global_time';
import type { ParsedAlertsData } from '../../overview/components/detection_response/alerts_by_status/types';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../overview/components/detection_response/alerts_by_status/types';
import { useAlertsByStatus } from '../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';

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

  const { data: dataMisconfiguration } = useMisconfigurationPreview({
    query: buildEntityFlyoutPreviewQuery(fieldName, name),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const passedFindings = dataMisconfiguration?.count.passed || 0;
  const failedFindings = dataMisconfiguration?.count.failed || 0;

  const hasMisconfigurationFindings = passedFindings > 0 || failedFindings > 0;

  const { data } = useVulnerabilitiesPreview({
    query: buildEntityFlyoutPreviewQuery(fieldName, name),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0, NONE = 0 } = data?.count || {};

  const hasVulnerabilitiesFindings = hasVulnerabilitiesData({
    critical: CRITICAL,
    high: HIGH,
    medium: MEDIUM,
    low: LOW,
    none: NONE,
  });

  const isVulnerabilitiesFindingForHost = hasVulnerabilitiesFindings && fieldName === 'host.name';

  const { signalIndexName } = useSignalIndex();

  const entityFilter = useMemo(() => ({ field: fieldName, value: name }), [fieldName, name]);

  const { to, from } = useGlobalTime();

  const { items: alertsData } = useAlertsByStatus({
    entityFilter,
    signalIndexName,
    queryId: DETECTION_RESPONSE_ALERTS_BY_STATUS_ID,
    to,
    from,
  });

  const filteredAlertsData: ParsedAlertsData = alertsData
    ? Object.fromEntries(Object.entries(alertsData).filter(([key]) => key !== 'closed'))
    : {};

  const alertsOpenCount = filteredAlertsData?.open?.total || 0;

  const alertsAcknowledgedCount = filteredAlertsData?.acknowledged?.total || 0;

  const alertsCount = alertsOpenCount + alertsAcknowledgedCount;

  if (alertsCount > 0) {
    insightContent.push(
      <>
        <AlertsPreview alertsData={filteredAlertsData} isPreviewMode={isPreviewMode} />
        <EuiSpacer size="s" />
      </>
    );
  }

  if (hasMisconfigurationFindings)
    insightContent.push(
      <>
        <MisconfigurationsPreview name={name} fieldName={fieldName} isPreviewMode={isPreviewMode} />
        <EuiSpacer size="s" />
      </>
    );
  if (isVulnerabilitiesFindingForHost && hasVulnerabilitiesFindings)
    insightContent.push(
      <>
        <VulnerabilitiesPreview name={name} isPreviewMode={isPreviewMode} />
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
