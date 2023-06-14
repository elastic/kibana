/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiStat,
  EuiTextColor,
  EuiText,
  EuiIconTip,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';

export interface BurnRateWindowParams {
  title: string;
  target: number;
  longWindow: {
    label: string;
    burnRate: number | null;
    sli: number | null;
  };
  shortWindow: {
    label: string;
    burnRate: number | null;
    sli: number | null;
  };
  isLoading?: boolean;
}

export function BurnRateWindow({
  title,
  target,
  longWindow,
  shortWindow,
  isLoading,
}: BurnRateWindowParams) {
  const longWindowColor =
    longWindow.burnRate === null ? 'subdued' : longWindow.burnRate > target ? 'danger' : 'success';
  const shortWindowColor =
    shortWindow.burnRate === null
      ? 'subdued'
      : shortWindow.burnRate > target
      ? 'danger'
      : 'success';

  const overallColor =
    longWindowColor === 'danger' && shortWindowColor === 'danger'
      ? 'danger'
      : longWindowColor !== shortWindowColor
      ? 'warning'
      : longWindowColor === 'subdued' && shortWindowColor === 'subdued'
      ? 'subdued'
      : 'success';
  return (
    <EuiPanel color={overallColor}>
      <EuiText color={overallColor}>
        <h5>
          {title}
          <EuiIconTip
            content={i18n.translate('xpack.observability.slo.burnRateWindow.thresholdTip', {
              defaultMessage: 'Threshold is {target}x',
              values: { target },
            })}
            position="top"
          />
        </h5>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            title={longWindow.burnRate ? `${numeral(longWindow.burnRate).format('0.[00]')}x` : '--'}
            titleColor={longWindowColor}
            titleSize="m"
            textAlign="left"
            isLoading={isLoading}
            description={
              <EuiTextColor color={longWindowColor}>
                <span>{longWindow.label}</span>
              </EuiTextColor>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={
              shortWindow.burnRate ? `${numeral(shortWindow.burnRate).format('0.[00]')}x` : '--'
            }
            titleColor={shortWindowColor}
            titleSize="m"
            textAlign="left"
            isLoading={isLoading}
            description={
              <EuiTextColor color={shortWindowColor}>
                <span>{shortWindow.label}</span>
              </EuiTextColor>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
