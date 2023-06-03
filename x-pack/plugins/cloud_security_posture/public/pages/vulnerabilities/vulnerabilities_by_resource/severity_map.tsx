/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/css';
import {
  EuiColorPaletteDisplay,
  EuiToolTip,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getSeverityStatusColor } from '../../../common/utils/get_vulnerability_colors';
import { SeverityStatusBadge } from '../../../components/vulnerability_badges';

interface Props {
  total: number;
  severityMap: SeverityMap;
}

interface SeverityMap {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const formatPercentage = (percentage: number) => {
  if (percentage === 0) {
    return '0 %';
  }

  if (percentage === 100) {
    return '100 %';
  }

  return `${percentage.toFixed(1)} %`;
};

export const SeverityMap = ({ severityMap, total }: Props) => {
  const { euiTheme } = useEuiTheme();

  const tooltipStyle = css`
    height: ${euiTheme.size.xl};
    display: flex;
    align-items: center;
  `;

  const paletteStyle = css`
    width: 100%;
  `;

  const severityMapPallet: any = [];
  const severityMapTooltip: any = [];

  if (total > 0) {
    const minStop = Math.max(0.08 * total, 1);

    const severityLevels: Array<keyof SeverityMap> = ['low', 'medium', 'high', 'critical'];

    let currentStop = 0;

    severityLevels.forEach((severity) => {
      if (severityMap[severity] > 0) {
        currentStop += Math.max(severityMap[severity], minStop);
        severityMapPallet.push({
          stop: currentStop,
          color: getSeverityStatusColor(severity.toUpperCase()),
        });
      }
      severityMapTooltip.push({
        severity,
        count: severityMap[severity],
        percentage: (severityMap[severity] / total) * 100,
      });
    });
  }

  return (
    <EuiToolTip
      className={css`
        width: 256px;
      `}
      anchorClassName={tooltipStyle}
      position="left"
      title={i18n.translate('xpack.csp.vulnerabilitiesByResource.severityMap.tooltipTitle', {
        defaultMessage: 'Severity map',
      })}
      content={<TooltipBody severityMapTooltip={severityMapTooltip} />}
    >
      <EuiColorPaletteDisplay type="fixed" palette={severityMapPallet} className={paletteStyle} />
    </EuiToolTip>
  );
};

const TooltipBody = ({
  severityMapTooltip,
}: {
  severityMapTooltip: Array<{ severity: string; count: number; percentage: number }>;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      {severityMapTooltip.map((severity) => (
        <EuiFlexGroup justifyContent="spaceBetween" key={severity.severity} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <SeverityStatusBadge status={severity.severity.toUpperCase()} />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s">{severity.count}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText
                  textAlign="right"
                  size="s"
                  className={css`
                    width: ${euiTheme.size.xxxl};
                    color: ${euiTheme.colors.mediumShade};
                  `}
                >
                  {formatPercentage(severity.percentage)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </>
  );
};
