/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFetchRelatedAlertsByAncestry } from '../../shared/hooks/use_fetch_related_alerts_by_ancestry';
import { CORRELATIONS_ANCESTRY_ALERTS } from '../../shared/translations';
import { InsightsSummaryRow } from './insights_summary_row';
import { INSIGHTS_CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID } from './test_ids';

const ICON = 'warning';

export interface RelatedAlertsByAncestryProps {
  /**
   * Value of the kibana.alert.ancestors.id field
   */
  documentId: string;
  /**
   * Values of the kibana.alert.rule.parameters.index field
   */
  indices: string[];
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}

/**
 * Show related alerts by ancestry in summary row
 */
export const RelatedAlertsByAncestry: React.VFC<RelatedAlertsByAncestryProps> = ({
  documentId,
  indices,
  scopeId,
}) => {
  const { loading, error, dataCount } = useFetchRelatedAlertsByAncestry({
    documentId,
    indices,
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
