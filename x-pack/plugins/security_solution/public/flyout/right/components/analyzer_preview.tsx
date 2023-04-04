/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { useAlertPrevalenceFromProcessTree } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import type { StatsNode } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { AnalyzerTree } from './analyzer_tree';
import { isActiveTimeline } from '../../../helpers';

interface Cache {
  statsNodes: StatsNode[];
}
interface AnalyzerPreviewProps {
  /**
   * Entity id details from ecs data
   */
  entityId: TimelineEventsDetailsItem;
  /**
   * Document id details from ecs data
   */
  documentId: TimelineEventsDetailsItem;
  /**
   * Index details from ecs data
   */
  index: TimelineEventsDetailsItem;
  /**
   * Data test subject string
   */
  ['data-test-subj']: string;
}

/**
 * Analyzer preview under Overview, Visualizations. It shows a tree representation of analyzer.
 */
export const AnalyzerPreview: React.FC<AnalyzerPreviewProps> = ({
  entityId,
  documentId,
  index,
  'data-test-subj': dataTestSuj,
}) => {
  const scopeId = 'fly-out'; // TO-DO: change to scopeId from context
  const [cache, setCache] = useState<Partial<Cache>>({});

  const { values: wrappedProcessEntityId } = entityId;
  const processEntityId = Array.isArray(wrappedProcessEntityId) ? wrappedProcessEntityId[0] : '';
  const { values: wrappedDocumentId } = documentId;
  const processDocumentId = Array.isArray(wrappedDocumentId) ? wrappedDocumentId[0] : '';
  const { values: indices } = index;

  const { loading, error, statsNodes } = useAlertPrevalenceFromProcessTree({
    processEntityId,
    isActiveTimeline: isActiveTimeline(scopeId),
    documentId: processDocumentId,
    indices: indices ?? [],
  });

  useEffect(() => {
    if (statsNodes && statsNodes.length !== 0) {
      setCache({ statsNodes });
    }
  }, [statsNodes, setCache]);

  return (
    <div data-test-subj={dataTestSuj}>
      <AnalyzerTree statsNodes={cache.statsNodes} loading={loading} error={error} />
    </div>
  );
};

AnalyzerPreview.displayName = 'AnalyzerPreview';
