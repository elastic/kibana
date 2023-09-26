/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { find } from 'lodash/fp';
import { EuiTreeView } from '@elastic/eui';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { getTreeNodes } from '../utils/analyzer_helpers';
import { ANALYZER_PREVIEW_TITLE } from './translations';
import { ANCESTOR_ID, RULE_INDICES } from '../../shared/constants/field_names';
import { useRightPanelContext } from '../context';
import { useAlertPrevalenceFromProcessTree } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import type { StatsNode } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { isActiveTimeline } from '../../../helpers';

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

  const { statsNodes } = useAlertPrevalenceFromProcessTree({
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

  if (!documentId || !index || !items || items.length === 0) {
    return null;
  }

  return (
    <div data-test-subj={ANALYZER_PREVIEW_TEST_ID}>
      <EuiTreeView
        items={items}
        display="compressed"
        aria-label={ANALYZER_PREVIEW_TITLE}
        showExpansionArrows
      />
    </div>
  );
};

AnalyzerPreview.displayName = 'AnalyzerPreview';
