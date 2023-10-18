/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { find } from 'lodash/fp';
import { EuiTreeView, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ANALYZER_PREVIEW_TEST_ID, ANALYZER_PREVIEW_LOADING_TEST_ID } from './test_ids';
import { getTreeNodes } from '../utils/analyzer_helpers';
import { ANCESTOR_ID, RULE_INDICES } from '../../shared/constants/field_names';
import { useRightPanelContext } from '../context';
import { useAlertPrevalenceFromProcessTree } from '../../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import type { StatsNode } from '../../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { isActiveTimeline } from '../../../../helpers';

const CHILD_COUNT_LIMIT = 3;
const ANCESTOR_LEVEL = 3;
const DESCENDANT_LEVEL = 3;

/**
 * Cache that stores fetched stats nodes
 */
interface Cache {
  statsNodes: StatsNode[];
}

/**
 * Analyzer preview under Overview, Visualizations. It shows a tree representation of analyzer.
 */
export const AnalyzerPreview: React.FC = () => {
  const [cache, setCache] = useState<Partial<Cache>>({});
  const { dataFormattedForFieldBrowser: data, scopeId } = useRightPanelContext();

  const documentId = find({ category: 'kibana', field: ANCESTOR_ID }, data);
  const processDocumentId =
    documentId && Array.isArray(documentId.values) ? documentId.values[0] : '';

  const index = find({ category: 'kibana', field: RULE_INDICES }, data);
  const indices = index?.values ?? [];

  const { statsNodes, loading, error } = useAlertPrevalenceFromProcessTree({
    isActiveTimeline: isActiveTimeline(scopeId),
    documentId: processDocumentId,
    indices,
  });

  useEffect(() => {
    if (statsNodes && statsNodes.length !== 0) {
      setCache({ statsNodes });
    }
  }, [statsNodes, setCache]);

  const items = useMemo(
    () => getTreeNodes(cache.statsNodes ?? [], CHILD_COUNT_LIMIT, ANCESTOR_LEVEL, DESCENDANT_LEVEL),
    [cache.statsNodes]
  );

  const showAnalyzerTree = documentId && index && items && items.length > 0 && !error;

  return loading ? (
    <EuiSkeletonText
      data-test-subj={ANALYZER_PREVIEW_LOADING_TEST_ID}
      contentAriaLabel={i18n.translate(
        'xpack.securitySolution.flyout.right.visualizations.analyzerPreview.loadingAriaLabel',
        {
          defaultMessage: 'analyzer preview',
        }
      )}
    />
  ) : showAnalyzerTree ? (
    <EuiTreeView
      items={items}
      display="compressed"
      aria-label={i18n.translate(
        'xpack.securitySolution.flyout.right.visualizations.analyzerPreview.treeViewAriaLabel',
        {
          defaultMessage: 'Analyzer preview',
        }
      )}
      showExpansionArrows
      data-test-subj={ANALYZER_PREVIEW_TEST_ID}
    />
  ) : (
    <FormattedMessage
      id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.errorDescription"
      defaultMessage="An error is preventing this alert from being analyzed."
    />
  );
};

AnalyzerPreview.displayName = 'AnalyzerPreview';
