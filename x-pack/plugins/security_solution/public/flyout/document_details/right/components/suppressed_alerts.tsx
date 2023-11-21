/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID,
  CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID,
} from './test_ids';
import { InsightsSummaryRow } from './insights_summary_row';
import { SUPPRESSED_ALERTS_COUNT_TECHNICAL_PREVIEW } from '../../../../common/components/event_details/insights/translations';

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
          text={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.correlations.suppressedAlertsLabel"
              defaultMessage="suppressed {count, plural, =1 {alert} other {alerts}}"
              values={{ count: alertSuppressionCount }}
            />
          }
          data-test-subj={CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID}
          key={`correlation-row-suppressed-alerts`}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          label={SUPPRESSED_ALERTS_COUNT_TECHNICAL_PREVIEW}
          size="s"
          iconType="beaker"
          tooltipContent={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.entities.suppressedAlertTechnicalPreviewTooltip"
              defaultMessage="This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features."
            />
          }
          tooltipPosition="bottom"
          data-test-subj={CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SuppressedAlerts.displayName = 'SuppressedAlerts';
