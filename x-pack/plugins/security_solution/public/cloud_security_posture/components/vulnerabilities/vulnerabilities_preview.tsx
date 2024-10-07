/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { i18n } from '@kbn/i18n';
import { ExpandablePanel } from '@kbn/security-solution-common';
import {
  buildEntityFlyoutPreviewQuery,
  VULNERABILITIES_SEVERITY,
  getAbbreviatedNumber,
} from '@kbn/cloud-security-posture-common';
import { getSeverityStatusColor, getSeverityText } from '@kbn/cloud-security-posture';

interface VulnerabilitiesDistributionBarProps {
  key: string;
  count: number;
  color: string;
}

const getVulnerabilityStats = (
  critical: number,
  high: number,
  medium: number,
  low: number,
  none: number
): VulnerabilitiesDistributionBarProps[] => {
  const vulnerabilityStats: VulnerabilitiesDistributionBarProps[] = [];
  if (critical === 0 && high === 0 && medium === 0 && low === 0 && none === 0)
    return vulnerabilityStats;

  if (none > 0)
    vulnerabilityStats.push({
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.vulnerabilities.noneVulnerabilitiesText',
        {
          defaultMessage: getSeverityText(VULNERABILITIES_SEVERITY.UNKNOWN),
        }
      ),
      count: none,
      color: getSeverityStatusColor(VULNERABILITIES_SEVERITY.UNKNOWN),
    });
  if (low > 0)
    vulnerabilityStats.push({
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.vulnerabilities.lowVulnerabilitiesText',
        {
          defaultMessage: getSeverityText(VULNERABILITIES_SEVERITY.LOW),
        }
      ),
      count: low,
      color: getSeverityStatusColor(VULNERABILITIES_SEVERITY.LOW),
    });

  if (medium > 0)
    vulnerabilityStats.push({
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.vulnerabilities.mediumVulnerabilitiesText',
        {
          defaultMessage: getSeverityText(VULNERABILITIES_SEVERITY.MEDIUM),
        }
      ),
      count: medium,
      color: getSeverityStatusColor(VULNERABILITIES_SEVERITY.MEDIUM),
    });
  if (high > 0)
    vulnerabilityStats.push({
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.vulnerabilities.highVulnerabilitiesText',
        {
          defaultMessage: getSeverityText(VULNERABILITIES_SEVERITY.HIGH),
        }
      ),
      count: high,
      color: getSeverityStatusColor(VULNERABILITIES_SEVERITY.HIGH),
    });
  if (critical > 0)
    vulnerabilityStats.push({
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.vulnerabilities.CriticalVulnerabilitiesText',
        {
          defaultMessage: getSeverityText(VULNERABILITIES_SEVERITY.CRITICAL),
        }
      ),
      count: critical,
      color: getSeverityStatusColor(VULNERABILITIES_SEVERITY.CRITICAL),
    });

  return vulnerabilityStats;
};

const VulnerabilitiesEmptyState = ({ euiTheme }: { euiTheme: EuiThemeComputed<{}> }) => {
  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiTitle size="m">
            <h1>{'-'}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="m"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
            data-test-subj="noVulnerabilitiesDataTestSubj"
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.vulnerabilities.noVulnerabilitiesDescription"
              defaultMessage="No vulnerabilities"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

const VulnerabilitiesCount = ({
  vulnerabilitiesTotal,
  euiTheme,
}: {
  vulnerabilitiesTotal: string | number;
  euiTheme: EuiThemeComputed<{}>;
}) => {
  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h1>{vulnerabilitiesTotal}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="m"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.vulnerabilities.vulnerabilitiesCountDescription"
              defaultMessage="Vulnerabilities"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export const VulnerabilitiesPreview = ({ hostName }: { hostName: string }) => {
  const { data } = useVulnerabilitiesPreview({
    query: buildEntityFlyoutPreviewQuery('host.name', hostName),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0, NONE = 0 } = data?.count || {};

  const totalVulnerabilities = CRITICAL + HIGH + MEDIUM + LOW + NONE;
  const { euiTheme } = useEuiTheme();
  const hasVulnerabilities = totalVulnerabilities > 0;
  return (
    <ExpandablePanel
      header={{
        title: (
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.vulnerabilities.vulnerabilitiesTitle"
              defaultMessage="Vulnerabilities"
            />
          </EuiText>
        ),
      }}
      data-test-subj={'securitySolutionFlyoutInsightsVulnerabilities'}
    >
      <EuiFlexGroup gutterSize="none">
        {hasVulnerabilities ? (
          <VulnerabilitiesCount
            vulnerabilitiesTotal={getAbbreviatedNumber(totalVulnerabilities)}
            euiTheme={euiTheme}
          />
        ) : (
          <VulnerabilitiesEmptyState euiTheme={euiTheme} />
        )}
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem />
            <EuiFlexItem>
              <EuiSpacer />
              <DistributionBar stats={getVulnerabilityStats(CRITICAL, HIGH, MEDIUM, LOW, NONE)} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
