/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, type EuiFlexGroupProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { getVulnerabilityStats, hasVulnerabilitiesData } from '@kbn/cloud-security-posture';
import { InsightDistributionBar } from './insight_distribution_bar';

interface VulnerabilitiesInsightProps {
  /**
   *  Host name to retrieve vulnerabilities for
   */
  hostName: string;
  /**
   * The direction of the flex group
   */
  direction?: EuiFlexGroupProps['direction'];
  /**
   * The data-test-subj to use for the component
   */
  ['data-test-subj']?: string;
}

/*
 * Displays a distribution bar with the count of critical vulnerabilities for a given host
 */
export const VulnerabilitiesInsight: React.FC<VulnerabilitiesInsightProps> = ({
  hostName,
  direction,
  'data-test-subj': dataTestSubj,
}) => {
  const { data } = useVulnerabilitiesPreview({
    query: buildEntityFlyoutPreviewQuery('host.name', hostName),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0, NONE = 0 } = data?.count || {};
  const hasVulnerabilitiesFindings = useMemo(
    () =>
      hasVulnerabilitiesData({
        critical: CRITICAL,
        high: HIGH,
        medium: MEDIUM,
        low: LOW,
        none: NONE,
      }),
    [CRITICAL, HIGH, MEDIUM, LOW, NONE]
  );

  const vulnerabilitiesStats = useMemo(
    () =>
      getVulnerabilityStats({
        critical: CRITICAL,
        high: HIGH,
        medium: MEDIUM,
        low: LOW,
        none: NONE,
      }),
    [CRITICAL, HIGH, MEDIUM, LOW, NONE]
  );

  if (!hasVulnerabilitiesFindings) return null;

  return (
    <EuiFlexItem data-test-subj={dataTestSubj}>
      <InsightDistributionBar
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.insights.vulnerabilitiesTitle"
            defaultMessage="Vulnerabilities:"
          />
        }
        stats={vulnerabilitiesStats}
        count={CRITICAL}
        direction={direction}
        data-test-subj={`${dataTestSubj}-distribution-bar`}
      />
    </EuiFlexItem>
  );
};

VulnerabilitiesInsight.displayName = 'VulnerabilitiesInsight';
