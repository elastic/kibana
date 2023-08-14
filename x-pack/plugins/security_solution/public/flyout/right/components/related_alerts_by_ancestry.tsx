/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useFetchRelatedAlertsByAncestry } from '../../shared/hooks/use_fetch_related_alerts_by_ancestry';
import { CORRELATIONS_ANCESTRY_ALERTS } from '../../shared/translations';
import { InsightsSummaryRow } from './insights_summary_row';
import { INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID } from './test_ids';

const ICON = 'warning';

export interface RelatedAlertsByAncestryProps {
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
export const RelatedAlertsByAncestry: React.VFC<RelatedAlertsByAncestryProps> = ({
  dataFormattedForFieldBrowser,
  scopeId,
}) => {
  const { loading, error, dataCount } = useFetchRelatedAlertsByAncestry({
    dataFormattedForFieldBrowser,
    scopeId,
  });
  const text = CORRELATIONS_ANCESTRY_ALERTS(dataCount);

  return (
    <InsightsSummaryRow
      loading={loading}
      error={error}
      icon={ICON}
      value={dataCount}
      text={text}
      data-test-subj={INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID}
      key={`correlation-row-${text}`}
    />
  );
};

RelatedAlertsByAncestry.displayName = 'RelatedAlertsByAncestry';
