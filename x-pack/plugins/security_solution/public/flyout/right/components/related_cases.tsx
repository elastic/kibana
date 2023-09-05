/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CORRELATIONS_RELATED_CASES } from '../../shared/translations';
import { useFetchRelatedCases } from '../../shared/hooks/use_fetch_related_cases';
import { InsightsSummaryRow } from './insights_summary_row';
import { INSIGHTS_CORRELATIONS_RELATED_CASES_TEST_ID } from './test_ids';

const ICON = 'warning';

export interface RelatedCasesProps {
  /**
   * Id of the document
   */
  eventId: string;
}

/**
 *
 */
export const RelatedCases: React.VFC<RelatedCasesProps> = ({ eventId }) => {
  const { loading, error, dataCount } = useFetchRelatedCases({ eventId });
  const text = CORRELATIONS_RELATED_CASES(dataCount);

  return (
    <InsightsSummaryRow
      loading={loading}
      error={error}
      icon={ICON}
      value={dataCount}
      text={text}
      data-test-subj={INSIGHTS_CORRELATIONS_RELATED_CASES_TEST_ID}
      key={`correlation-row-${text}`}
    />
  );
};

RelatedCases.displayName = 'RelatedCases';
