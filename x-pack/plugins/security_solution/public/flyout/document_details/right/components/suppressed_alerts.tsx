/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { i18n } from '@kbn/i18n';

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { useDocumentDetailsContext } from '../../shared/context';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import { InsightsSummaryRow } from './insights_summary_row';
import {
  CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID,
  CORRELATIONS_SUPPRESSED_ALERTS_TECHNICAL_PREVIEW_TEST_ID,
  CORRELATIONS_SUPPRESSED_ALERTS_BUTTON_TEST_ID,
} from './test_ids';
import { isSuppressionRuleInGA } from '../../../../../common/detection_engine/utils';

const SUPPRESSED_ALERTS_COUNT_TECHNICAL_PREVIEW = i18n.translate(
  'xpack.securitySolution.flyout.right.overview.insights.suppressedAlertsCountTechnicalPreview',
  {
    defaultMessage: 'Technical Preview',
  }
);
const BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.right.insights.entities.suppressedAlerts.buttonLabel',
  { defaultMessage: 'Suppressed alerts' }
);

export interface SuppressedAlertsProps {
  /**
   * Value of the kibana.alert.suppression.doc_count field
   */
  alertSuppressionCount: number;
  /**
   * Rule type, value of kibana.alert.rule.type field
   */
  ruleType: Type | undefined;
}

/**
 * Show related alerts by ancestry in summary row
 */
export const SuppressedAlerts: React.VFC<SuppressedAlertsProps> = ({
  alertSuppressionCount,
  ruleType,
}) => {
  const { eventId, indexName, scopeId, isPreviewMode } = useDocumentDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();

  const onClick = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: LeftPanelInsightsTab,
        subTab: CORRELATIONS_TAB_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, indexName, openLeftPanel, scopeId]);

  const text = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.insights.correlations.suppressedAlertsLabel"
        defaultMessage="Suppressed {count, plural, one {alert} other {alerts}}"
        values={{ count: alertSuppressionCount }}
      />
    ),
    [alertSuppressionCount]
  );

  const value = useMemo(
    () => (
      <EuiButtonEmpty
        aria-label={BUTTON}
        onClick={onClick}
        flush={'both'}
        size="xs"
        disabled={isPreviewMode}
        data-test-subj={CORRELATIONS_SUPPRESSED_ALERTS_BUTTON_TEST_ID}
      >
        <FormattedCount count={alertSuppressionCount} />
      </EuiButtonEmpty>
    ),
    [alertSuppressionCount, isPreviewMode, onClick]
  );

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <InsightsSummaryRow
          text={text}
          value={value}
          data-test-subj={CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID}
          key={`correlation-row-suppressed-alerts`}
        />
      </EuiFlexItem>
      {ruleType && isSuppressionRuleInGA(ruleType) ? null : (
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
      )}
    </EuiFlexGroup>
  );
};

SuppressedAlerts.displayName = 'SuppressedAlerts';
