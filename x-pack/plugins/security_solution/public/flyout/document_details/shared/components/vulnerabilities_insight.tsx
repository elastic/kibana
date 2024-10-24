/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, type EuiFlexGroupProps, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { getVulnerabilityStats, hasVulnerabilitiesData } from '@kbn/cloud-security-posture';
import { InsightDistributionBar } from './insight_distribution_bar';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { PreviewLink } from '../../../shared/components/preview_link';
import { useDocumentDetailsContext } from '../context';

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
 * Displays a distribution bar and the total vulnerabilities count for a given host
 */
export const VulnerabilitiesInsight: React.FC<VulnerabilitiesInsightProps> = ({
  hostName,
  direction,
  'data-test-subj': dataTestSubj,
}) => {
  const { scopeId, isPreview } = useDocumentDetailsContext();
  const { euiTheme } = useEuiTheme();
  const { data } = useVulnerabilitiesPreview({
    query: buildEntityFlyoutPreviewQuery('host.name', hostName),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0, NONE = 0 } = data?.count || {};
  const totalVulnerabilities = useMemo(
    () => CRITICAL + HIGH + MEDIUM + LOW + NONE,
    [CRITICAL, HIGH, MEDIUM, LOW, NONE]
  );

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

  const count = useMemo(
    () => (
      <div
        css={css`
          margin-top: ${euiTheme.size.xs};
          margin-bottom: ${euiTheme.size.xs};
        `}
      >
        <PreviewLink
          field={'host.name'}
          value={hostName}
          scopeId={scopeId}
          isPreview={isPreview}
          data-test-subj={`${dataTestSubj}-count`}
        >
          <FormattedCount count={totalVulnerabilities} />
        </PreviewLink>
      </div>
    ),
    [totalVulnerabilities, hostName, scopeId, isPreview, dataTestSubj, euiTheme.size]
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
        count={count}
        direction={direction}
        data-test-subj={`${dataTestSubj}-distribution-bar`}
      />
    </EuiFlexItem>
  );
};

VulnerabilitiesInsight.displayName = 'VulnerabilitiesInsight';
