/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';

import { useDocumentDetailsContext } from '../../shared/context';
import { ANALYZER_GRAPH_TEST_ID } from './test_ids';
import { Resolver } from '../../../../resolver/view';
import { useTimelineDataFilters } from '../../../../timelines/containers/use_timeline_data_filters';
import { isActiveTimeline } from '../../../../helpers';

export const ANALYZE_GRAPH_ID = 'analyze_graph';

/**
 * Analyzer graph view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const AnalyzeGraph: FC = () => {
  const { eventId } = useDocumentDetailsContext();
  const scopeId = 'flyout'; // Different scope Id to distinguish flyout and data table analyzers
  const { from, to, shouldUpdate, selectedPatterns } = useTimelineDataFilters(
    isActiveTimeline(scopeId)
  );
  const filters = useMemo(() => ({ from, to }), [from, to]);

  // TODO as part of https://github.com/elastic/security-team/issues/7032
  //  bring back no data message if needed

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
