/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useFetchRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_fetch_related_alerts_by_same_source_event';
import { CORRELATIONS_SAME_SOURCE_ALERTS } from '../../shared/translations';
import { InsightsSummaryRow } from './insights_summary_row';
import { INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID } from './test_ids';

const ICON = 'warning';

export interface RelatedAlertsBySameSourceEventProps {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}

/**
 *
 */
export const RelatedAlertsBySameSourceEvent: React.VFC<RelatedAlertsBySameSourceEventProps> = ({
  dataFormattedForFieldBrowser,
  scopeId,
}) => {
  const { loading, error, dataCount } = useFetchRelatedAlertsBySameSourceEvent({
    dataFormattedForFieldBrowser,
    scopeId,
  });
  const text = CORRELATIONS_SAME_SOURCE_ALERTS(dataCount);

  return (
    <InsightsSummaryRow
      loading={loading}
      error={error}
      icon={ICON}
      value={dataCount}
      text={text}
      data-test-subj={INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID}
      key={`correlation-row-${text}`}
    />
  );
};

RelatedAlertsBySameSourceEvent.displayName = 'RelatedAlertsBySameSourceEvent';
