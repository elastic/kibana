/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { ALERT_RULE_TYPE } from '@kbn/rule-data-utils';
import { EuiBetaBadge, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ExpandablePanel } from '@kbn/security-solution-common';
import {
  CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID,
  SUPPRESSED_ALERTS_SECTION_TECHNICAL_PREVIEW_TEST_ID,
} from './test_ids';
import { InvestigateInTimelineAction } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';
import { isSuppressionRuleInGA } from '../../../../../common/detection_engine/utils';

const SUPPRESSED_ALERTS_COUNT_TECHNICAL_PREVIEW = i18n.translate(
  'xpack.securitySolution.flyout.left.insights.suppressedAlertsCountTechnicalPreview',
  {
    defaultMessage: 'Technical Preview',
  }
);

export interface SuppressedAlertsProps {
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs;
  /**
   * Value of the kibana.alert.suppression.doc_count field
   */
  alertSuppressionCount: number;
  /**
   * Indicate whether suppressed alert is shown in alert preview (rule creation)
   */
  isPreview: boolean;
}

/**
 * Displays number of suppressed alerts and investigate in timeline icon
 */
export const SuppressedAlerts: React.FC<SuppressedAlertsProps> = ({
  dataAsNestedObject,
  alertSuppressionCount,
  isPreview,
}) => {
  const ruleType = get(dataAsNestedObject, ALERT_RULE_TYPE)?.[0];

  const title = (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.insights.correlations.suppressedAlertsTitle"
          defaultMessage="{count} suppressed {count, plural, =1 {alert} other {alerts}}"
          values={{ count: alertSuppressionCount }}
        />
      </EuiFlexItem>
      {isSuppressionRuleInGA(ruleType) ? null : (
        <EuiFlexItem>
          <EuiBetaBadge
            label={SUPPRESSED_ALERTS_COUNT_TECHNICAL_PREVIEW}
            style={{ verticalAlign: 'middle' }}
            size="s"
            data-test-subj={SUPPRESSED_ALERTS_SECTION_TECHNICAL_PREVIEW_TEST_ID}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  const headerContent = alertSuppressionCount > 0 && !isPreview && (
    <div
      data-test-subj={`${CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID}InvestigateInTimeline`}
    >
      <InvestigateInTimelineAction ecsRowData={dataAsNestedObject} buttonType={'emptyButton'} />
    </div>
  );

  return (
    <ExpandablePanel
      header={{
        title,
        iconType: 'layers',
        headerContent,
      }}
      data-test-subj={CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID}
    />
  );
};

SuppressedAlerts.displayName = 'SuppressedAlerts';
