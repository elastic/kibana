/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { useDocumentDetailsContext } from '../../shared/context';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import {
  CORRELATIONS_RELATED_CASES_BUTTON_TEST_ID,
  CORRELATIONS_RELATED_CASES_TEST_ID,
} from './test_ids';
import { InsightsSummaryRow } from './insights_summary_row';
import { useFetchRelatedCases } from '../../shared/hooks/use_fetch_related_cases';

const BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.right.insights.entities.relatedCases.buttonLabel',
  { defaultMessage: 'Related cases' }
);

export interface RelatedCasesProps {
  /**
   * Id of the document
   */
  eventId: string;
}

/**
 * Show related cases in summary row
 */
export const RelatedCases: React.VFC<RelatedCasesProps> = ({ eventId }) => {
  const { indexName, scopeId, isPreviewMode } = useDocumentDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();

  const { loading, error, dataCount } = useFetchRelatedCases({ eventId });

  const onClick = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: LeftPanelInsightsTab,
        subTab: CORRELATIONS_TAB_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, indexName, openLeftPanel, scopeId]);

  const text = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.insights.correlations.relatedCasesLabel"
        defaultMessage="Related {count, plural, one {case} other {cases}}"
        values={{ count: dataCount }}
      />
    ),
    [dataCount]
  );

  const value = useMemo(
    () => (
      <EuiButtonEmpty
        aria-label={BUTTON}
        onClick={onClick}
        flush={'both'}
        size="xs"
        disabled={isPreviewMode}
        data-test-subj={CORRELATIONS_RELATED_CASES_BUTTON_TEST_ID}
      >
        <FormattedCount count={dataCount} />
      </EuiButtonEmpty>
    ),
    [dataCount, isPreviewMode, onClick]
  );

  return (
    <InsightsSummaryRow
      loading={loading}
      error={error}
      text={text}
      value={value}
      data-test-subj={CORRELATIONS_RELATED_CASES_TEST_ID}
      key={`correlation-row-${text}`}
    />
  );
};

RelatedCases.displayName = 'RelatedCases';
