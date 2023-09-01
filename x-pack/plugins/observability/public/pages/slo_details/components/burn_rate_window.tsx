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
  size?: 'xxxs' | 'xxs' | 'xs' | 's' | 'm' | 'l';
}

const SUBDUED = 'subdued';
const DANGER = 'danger';
const SUCCESS = 'success';
const WARNING = 'warning';

function getColorBasedOnBurnRate(target: number, burnRate: number | null, sli: number | null) {
  if (burnRate === null || sli === null || sli < 0) {
    return SUBDUED;
  }
  if (burnRate > target) {
    return DANGER;
  }
  return SUCCESS;
}

export function BurnRateWindow({
  title,
  target,
  longWindow,
  shortWindow,
  isLoading,
  size = 's',
}: BurnRateWindowParams) {
  const longWindowColor = getColorBasedOnBurnRate(target, longWindow.burnRate, longWindow.sli);
  const shortWindowColor = getColorBasedOnBurnRate(target, shortWindow.burnRate, shortWindow.sli);

  const overallColor =
    longWindowColor === DANGER && shortWindowColor === DANGER
      ? DANGER
      : [longWindowColor, shortWindowColor].includes(DANGER)
      ? WARNING
      : longWindowColor === SUBDUED && shortWindowColor === SUBDUED
      ? SUBDUED
      : SUCCESS;

  const isLongWindowValid =
    longWindow.burnRate != null && longWindow.sli != null && longWindow.sli >= 0;

  const isShortWindowValid =
    shortWindow.burnRate != null && shortWindow.sli != null && shortWindow.sli >= 0;

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
            title={isLongWindowValid ? `${numeral(longWindow.burnRate).format('0.[00]')}x` : '--'}
            titleColor={longWindowColor}
            titleSize={size}
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
            title={isShortWindowValid ? `${numeral(shortWindow.burnRate).format('0.[00]')}x` : '--'}
            titleColor={shortWindowColor}
            titleSize={size}
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
