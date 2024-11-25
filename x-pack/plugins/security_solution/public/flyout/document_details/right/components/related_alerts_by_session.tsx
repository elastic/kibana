/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import { useFetchRelatedAlertsBySession } from '../../shared/hooks/use_fetch_related_alerts_by_session';
import { InsightsSummaryRow } from './insights_summary_row';
import { CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID } from './test_ids';

export interface RelatedAlertsBySessionProps {
  /**
   * Value of the process.entry_leader.entity_id field
   */
  entityId: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}

/**
 * Show related alerts by session in summary row
 */
export const RelatedAlertsBySession: React.VFC<RelatedAlertsBySessionProps> = ({
  entityId,
  scopeId,
}) => {
  const { loading, error, dataCount } = useFetchRelatedAlertsBySession({
    entityId,
    scopeId,
  });

  const text = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.insights.correlations.sessionAlertsLabel"
        defaultMessage="{count, plural, one {Alert} other {Alerts}} related by session"
        values={{ count: dataCount }}
      />
    ),
    [dataCount]
  );

  return (
    <InsightsSummaryRow
      loading={loading}
      error={error}
      text={text}
      value={dataCount}
      expandedSubTab={CORRELATIONS_TAB_ID}
      data-test-subj={CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID}
      key={`correlation-row-${text}`}
    />
  );
};

RelatedAlertsBySession.displayName = 'RelatedAlertsBySession';
