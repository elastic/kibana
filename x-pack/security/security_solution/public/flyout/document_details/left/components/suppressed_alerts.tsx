/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { EuiBetaBadge, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import {
  CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID,
  SUPPRESSED_ALERTS_SECTION_TECHNICAL_PREVIEW_TEST_ID,
} from './test_ids';
import { SUPPRESSED_ALERTS_COUNT_TECHNICAL_PREVIEW } from '../../../../common/components/event_details/insights/translations';
import { InvestigateInTimelineAction } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';

export interface SuppressedAlertsProps {
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs;
  /**
   * Value of the kibana.alert.suppression.doc_count field
   */
  alertSuppressionCount: number;
}

/**
 * Displays number of suppressed alerts and investigate in timeline icon
 */
export const SuppressedAlerts: React.VFC<SuppressedAlertsProps> = ({
  dataAsNestedObject,
  alertSuppressionCount,
}) => {
  const title = (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.insights.correlations.suppressedAlertsTitle"
          defaultMessage="{count} suppressed {count, plural, =1 {alert} other {alerts}}"
          values={{ count: alertSuppressionCount }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBetaBadge
          label={SUPPRESSED_ALERTS_COUNT_TECHNICAL_PREVIEW}
          style={{ verticalAlign: 'middle' }}
          size="s"
          data-test-subj={SUPPRESSED_ALERTS_SECTION_TECHNICAL_PREVIEW_TEST_ID}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const headerContent = alertSuppressionCount > 0 && (
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
