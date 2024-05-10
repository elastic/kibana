/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiText, EuiTextColor } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { SLODefinitionResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { toDuration, toMinutes } from '../../../utils/slo/duration';

export interface BurnRateParams {
  slo: SLODefinitionResponse;
  threshold: number;
  burnRate?: number;
  isLoading?: boolean;
}

type Status = 'NO_DATA' | 'BREACHED' | 'OK';

function getTitleFromStatus(status: Status): string {
  if (status === 'NO_DATA')
    return i18n.translate('xpack.slo.burnRate.noDataStatusTitle', {
      defaultMessage: 'No value',
    });
  if (status === 'BREACHED')
    return i18n.translate('xpack.slo.burnRate.breachedStatustTitle', {
      defaultMessage: 'Critical value breached',
    });

  return i18n.translate('xpack.slo.burnRate.okStatusTitle', {
    defaultMessage: 'Acceptable value',
  });
}

function getSubtitleFromStatus(
  status: Status,
  burnRate: number | undefined = 1,
  slo: SLODefinitionResponse
): string {
  if (status === 'NO_DATA')
    return i18n.translate('xpack.slo.burnRate.noDataStatusSubtitle', {
      defaultMessage: 'Waiting for more data.',
    });
  if (status === 'BREACHED')
    return i18n.translate('xpack.slo.burnRate.breachedStatustSubtitle', {
      defaultMessage: 'At current rate, the error budget will be exhausted in {hour} hours.',
      values: {
        hour: numeral(
          moment
            .duration(toMinutes(toDuration(slo.timeWindow.duration)) / burnRate, 'minutes')
            .asHours()
        ).format('0'),
      },
    });

  return i18n.translate('xpack.slo.burnRate.okStatusSubtitle', {
    defaultMessage: 'There is no risk of error budget exhaustion.',
  });
}

export function BurnRate({ threshold, burnRate, slo, isLoading }: BurnRateParams) {
  const status: Status =
    burnRate === undefined ? 'NO_DATA' : burnRate > threshold ? 'BREACHED' : 'OK';
  const color = status === 'NO_DATA' ? 'subdued' : status === 'BREACHED' ? 'danger' : 'success';

  return (
    <EuiPanel color={color} hasShadow={false}>
      <EuiFlexGroup justifyContent="spaceBetween" direction="column" style={{ minHeight: '100%' }}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiText color="default" size="m">
              <h5>{getTitleFromStatus(status)}</h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              {getSubtitleFromStatus(status, burnRate, slo)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup direction="row" justifyContent="flexEnd" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiStat
              title={burnRate !== undefined ? `${numeral(burnRate).format('0.[00]')}x` : '--'}
              titleColor="default"
              titleSize="s"
              textAlign="right"
              isLoading={isLoading}
              data-test-subj="sloDetailsBurnRateStat"
              description={
                <EuiTextColor color="default">
                  <span>
                    {i18n.translate('xpack.slo.burnRate.threshold', {
                      defaultMessage: 'Threshold is {threshold}x',
                      values: { threshold: numeral(threshold).format('0.[00]') },
                    })}
                  </span>
                </EuiTextColor>
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
