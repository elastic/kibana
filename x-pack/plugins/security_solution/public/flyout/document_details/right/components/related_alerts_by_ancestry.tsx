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
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { useDocumentDetailsContext } from '../../shared/context';
import { useFetchRelatedAlertsByAncestry } from '../../shared/hooks/use_fetch_related_alerts_by_ancestry';
import { InsightsSummaryRow } from './insights_summary_row';
import {
  CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_BUTTON_TEST_ID,
  CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID,
} from './test_ids';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';

const BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.right.insights.entities.relatedAlertsByAncestry.buttonLabel',
  { defaultMessage: 'Related alerts by ancestry' }
);

export interface RelatedAlertsByAncestryProps {
  /**
   * Id of the document
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
  const { eventId, indexName, isPreviewMode } = useDocumentDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();

  const { loading, error, dataCount } = useFetchRelatedAlertsByAncestry({
    documentId,
    indices,
    scopeId,
  });

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
        id="xpack.securitySolution.flyout.right.insights.correlations.ancestryAlertsLabel"
        defaultMessage="{count, plural, one {Alert} other {Alerts}} related by ancestry"
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
        data-test-subj={CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_BUTTON_TEST_ID}
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
      data-test-subj={CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID}
      key={`correlation-row-${text}`}
    />
  );
};

RelatedAlertsByAncestry.displayName = 'RelatedAlertsByAncestry';
