/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useFetchRelatedAlertsBySession } from '../../shared/hooks/use_fetch_related_alerts_by_session';
import { CORRELATIONS_SESSION_ALERTS } from '../../shared/translations';
import { InsightsSummaryRow } from './insights_summary_row';
import { INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID } from './test_ids';

const ICON = 'warning';

export interface RelatedAlertsBySessionProps {
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
export const RelatedAlertsBySession: React.VFC<RelatedAlertsBySessionProps> = ({
  dataFormattedForFieldBrowser,
  scopeId,
}) => {
  const { loading, error, dataCount } = useFetchRelatedAlertsBySession({
    dataFormattedForFieldBrowser,
    scopeId,
  });
  const text = CORRELATIONS_SESSION_ALERTS(dataCount);

  return (
    <InsightsSummaryRow
      loading={loading}
      error={error}
      icon={ICON}
      value={dataCount}
      text={text}
      data-test-subj={INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID}
      key={`correlation-row-${text}`}
    />
  );
};

RelatedAlertsBySession.displayName = 'RelatedAlertsBySession';
