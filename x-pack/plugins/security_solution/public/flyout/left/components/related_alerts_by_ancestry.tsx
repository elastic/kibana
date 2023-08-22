/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CorrelationsDetailsAlertsTable } from './correlations_details_alerts_table';
import { CORRELATIONS_ANCESTRY_ALERTS } from '../../shared/translations';
import { useFetchRelatedAlertsByAncestry } from '../../shared/hooks/use_fetch_related_alerts_by_ancestry';
import { CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID } from './test_ids';

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
 * Show related alerts by ancestry in an expandable panel with a table
 */
export const RelatedAlertsByAncestry: React.VFC<RelatedAlertsByAncestryProps> = ({
  documentId,
  indices,
  scopeId,
}) => {
  const { loading, error, data, dataCount } = useFetchRelatedAlertsByAncestry({
    documentId,
    indices,
    scopeId,
  });
  const title = `${dataCount} ${CORRELATIONS_ANCESTRY_ALERTS(dataCount)}`;

  if (error) {
    return null;
  }

  return (
    <CorrelationsDetailsAlertsTable
      title={title}
      loading={loading}
      alertIds={data}
      data-test-subj={CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID}
    />
  );
};

RelatedAlertsByAncestry.displayName = 'RelatedAlertsByAncestry';
