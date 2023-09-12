/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import numeral from '@elastic/numeral';

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { useKibana } from '../../utils/kibana_react';
import { SloStatusBadge } from '../../components/slo/slo_status_badge';
import { SloActiveAlertsBadge } from '../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloSummary({ slo }: Props) {
  console.log(slo.name, '!!my slo');
  const { uiSettings, i18n } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const isSloFailed = slo.summary.status === 'VIOLATED' || slo.summary.status === 'DEGRADING';
  const titleColor = isSloFailed ? 'danger' : '';
  const errorBudgetRemaining =
    slo.summary.errorBudget.remaining <= 0
      ? Math.trunc(slo.summary.errorBudget.remaining * 100) / 100
      : slo.summary.errorBudget.remaining;

  return (
    <EuiFlexGroup direction="row" gutterSize="xs" data-test-subj="sloList">
      <EuiFlexItem grow={false} style={{ maxWidth: 200 }}>
        <EuiFlexGroup
          direction="row"
          responsive={false}
          gutterSize="s"
          alignItems="center"
          justifyContent="flexEnd"
        >
          <EuiFlexItem grow={false}>
            <EuiStat
              description="99% Target"
              title={
                slo.summary.status === 'NO_DATA'
                  ? NOT_AVAILABLE_LABEL
                  : numeral(slo.summary.sliValue).format(percentFormat)
              }
              textAlign="right"
              titleColor={titleColor}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ maxWidth: 200 }}>
            <EuiFlexGroup
              direction="row"
              responsive={false}
              gutterSize="s"
              alignItems="center"
              justifyContent="flexEnd"
            >
              <EuiFlexItem grow={false}>
                <EuiStat
                  description="Budget remaining"
                  textAlign="right"
                  title={
                    slo.summary.status === 'NO_DATA'
                      ? NOT_AVAILABLE_LABEL
                      : numeral(errorBudgetRemaining).format(percentFormat)
                  }
                  titleColor={titleColor}
                  titleSize="m"
                  reverse
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
