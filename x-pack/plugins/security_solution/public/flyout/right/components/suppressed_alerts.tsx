/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge } from '@elastic/eui';
import {
  INSIGHTS_CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID,
  SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID,
} from './test_ids';
import { CORRELATIONS_SUPPRESSED_ALERTS } from '../../shared/translations';
import { InsightsSummaryRow } from './insights_summary_row';
import { SUPPRESSED_ALERTS_COUNT_TECHNICAL_PREVIEW } from '../../../common/components/event_details/insights/translations';
import { TECHNICAL_PREVIEW_MESSAGE } from './translations';

export interface SuppressedAlertsProps {
  /**
   * Value of the kibana.alert.suppression.doc_count field
   */
  alertSuppressionCount: number;
}

/**
 * Show related alerts by ancestry in summary row
 */
export const SuppressedAlerts: React.VFC<SuppressedAlertsProps> = ({ alertSuppressionCount }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <InsightsSummaryRow
          loading={false}
          error={false}
          icon={'layers'}
          value={alertSuppressionCount}
          text={CORRELATIONS_SUPPRESSED_ALERTS(alertSuppressionCount)}
          data-test-subj={INSIGHTS_CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID}
          key={`correlation-row-suppressed-alerts`}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          label={SUPPRESSED_ALERTS_COUNT_TECHNICAL_PREVIEW}
          size="s"
          iconType="beaker"
          tooltipContent={TECHNICAL_PREVIEW_MESSAGE}
          tooltipPosition="bottom"
          data-test-subj={SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SuppressedAlerts.displayName = 'SuppressedAlerts';
