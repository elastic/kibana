/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFetchRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_fetch_related_alerts_by_same_source_event';
import { InsightsSummaryRow } from './insights_summary_row';
import { CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID } from './test_ids';

const ICON = 'warning';

export interface RelatedAlertsBySameSourceEventProps {
  /**
   * Value of the kibana.alert.original_event.id field
   */
  originalEventId: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}

/**
 * Show related alerts by same source event in summary row
 */
export const RelatedAlertsBySameSourceEvent: React.VFC<RelatedAlertsBySameSourceEventProps> = ({
  originalEventId,
  scopeId,
}) => {
  const { loading, dataCount } = useFetchRelatedAlertsBySameSourceEvent({
    originalEventId,
    scopeId,
  });
  const text = (
    <FormattedMessage
      id="xpack.securitySolution.flyout.right.insights.correlations.sourceAlertsLabel"
      defaultMessage="{count, plural, one {alert} other {alerts}} related by source event"
      values={{ count: dataCount }}
    />
  );

  return (
    <InsightsSummaryRow
      loading={loading}
      icon={ICON}
      value={dataCount}
      text={text}
      data-test-subj={CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID}
      key={`correlation-row-${text}`}
    />
  );
};

RelatedAlertsBySameSourceEvent.displayName = 'RelatedAlertsBySameSourceEvent';
