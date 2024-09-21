/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import numeral from '@elastic/numeral';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { ExpandablePanel } from '@kbn/security-solution-common';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';

export const getAbbreviatedNumber = (value: number) => {
  if (isNaN(value)) {
    return 0;
  }
  return value < 1000 ? value : numeral(value).format('0.0a');
};

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
  unknown: number
): VulnerabilitiesDistributionBarProps[] => {
  const vulnPropsArray: VulnerabilitiesDistributionBarProps[] = [];
  if (critical === 0 && high === 0 && medium === 0 && low === 0 && unknown === 0)
    return vulnPropsArray;

  if (unknown > 0)
    vulnPropsArray.push({
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.vulnerabilities.unknownVulnerabilitiesText',
        {
          defaultMessage: 'Unknown',
        }
      ),
      count: unknown,
      color: euiThemeVars.euiColorSuccess,
    });
  if (low > 0)
    vulnPropsArray.push({
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.vulnerabilities.lowVulnerabilitiesText',
        {
          defaultMessage: 'Low',
        }
      ),
      count: low,
      color: euiThemeVars.euiColorVis0,
    });

  if (medium > 0)
    vulnPropsArray.push({
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.vulnerabilities.mediumVulnerabilitiesText',
        {
          defaultMessage: 'Medium',
        }
      ),
      count: medium,
      color: euiThemeVars.euiColorVis5_behindText,
    });
  if (high > 0)
    vulnPropsArray.push({
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.vulnerabilities.highVulnerabilitiesText',
        {
          defaultMessage: 'High',
        }
      ),
      count: high,
      color: euiThemeVars.euiColorVis9_behindText,
    });
  if (critical > 0)
    vulnPropsArray.push({
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.vulnerabilities.CriticalVulnerabilitiesText',
        {
          defaultMessage: 'Critical',
        }
      ),
      count: critical,
      color: euiThemeVars.euiColorDanger,
    });

  return vulnPropsArray;
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

  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0, UNKNOWN = 0 } = data?.count || {};

  const totalVulnerabilities = CRITICAL + HIGH + MEDIUM + LOW + UNKNOWN;
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
              id="xpack.securitySolution.flyout.right.insights.misconfigurations.misconfigurationsTitle"
              defaultMessage="Vulnerabilities"
            />
          </EuiText>
        ),
      }}
      data-test-subj={'securitySolutionFlyoutInsightsMisconfigurations'}
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
              <DistributionBar
                stats={getVulnerabilityStats(CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
