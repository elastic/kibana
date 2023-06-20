/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { find } from 'lodash/fp';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { useRightPanelContext } from '../context';
import { useAlertPrevalenceFromProcessTree } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import type { StatsNode } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { AnalyzerTree } from './analyzer_tree';
import { isActiveTimeline } from '../../../helpers';

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

  const documentId = find({ category: 'kibana', field: 'kibana.alert.ancestors.id' }, data);
  const processDocumentId =
    documentId && Array.isArray(documentId.values) ? documentId.values[0] : '';

  const index = find({ category: 'kibana', field: 'kibana.alert.rule.parameters.index' }, data);
  const indices = index?.values ?? [];

  const { loading, error, statsNodes } = useAlertPrevalenceFromProcessTree({
    isActiveTimeline: isActiveTimeline(scopeId),
    documentId: processDocumentId,
    indices,
  });

  useEffect(() => {
    if (statsNodes && statsNodes.length !== 0) {
      setCache({ statsNodes });
    }
  }, [statsNodes, setCache]);

  return (
    <div data-test-subj={ANALYZER_PREVIEW_TEST_ID}>
      {documentId && index && (
        <AnalyzerTree statsNodes={cache.statsNodes} loading={loading} error={error} />
      )}
    </div>
  );
};

AnalyzerPreview.displayName = 'AnalyzerPreview';
