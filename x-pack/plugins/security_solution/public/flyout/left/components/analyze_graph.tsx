/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

import { ANALYZER_ERROR_MESSAGE } from './translations';
import { useLeftPanelContext } from '../context';
import { ANALYZE_GRAPH_ERROR_TEST_ID, ANALYZER_GRAPH_TEST_ID } from './test_ids';
import { Resolver } from '../../../resolver/view';
import { useTimelineDataFilters } from '../../../timelines/containers/use_timeline_data_filters';
import { ERROR_TITLE, ERROR_MESSAGE } from '../../shared/translations';
import { isActiveTimeline } from '../../../helpers';

export const ANALYZE_GRAPH_ID = 'analyze_graph';

/**
 * Analyzer graph view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const AnalyzeGraph: FC = () => {
  const { eventId } = useLeftPanelContext();
  const scopeId = 'flyout'; // Different scope Id to distinguish flyout and data table analyzers
  const { from, to, shouldUpdate, selectedPatterns } = useTimelineDataFilters(
    isActiveTimeline(scopeId)
  );
  const filters = useMemo(() => ({ from, to }), [from, to]);

  if (!eventId) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{ERROR_TITLE(ANALYZER_ERROR_MESSAGE)}</h2>}
        body={<p>{ERROR_MESSAGE(ANALYZER_ERROR_MESSAGE)}</p>}
        data-test-subj={ANALYZE_GRAPH_ERROR_TEST_ID}
      />
    );
  }

  return (
    <div data-test-subj={ANALYZER_GRAPH_TEST_ID}>
      <Resolver
        databaseDocumentID={eventId}
        resolverComponentInstanceID={scopeId}
        indices={selectedPatterns}
        shouldUpdate={shouldUpdate}
        filters={filters}
      />
    </div>
  );
};

AnalyzeGraph.displayName = 'AnalyzeGraph';
