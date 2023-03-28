/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useLeftPanelContext } from '../context';
import { ANALYZER_GRAPH_TEST_ID } from './test_ids';
import { Resolver } from '../../../resolver/view';
import { useTimelineDataFilters } from '../../../timelines/containers/use_timeline_data_filters';
import { ERROR_TITLE, ERROR_MESSAGE } from '../../shared/translations';
import { isActiveTimeline } from '../../../helpers';

export const ANALYZE_GRAPH_ID = 'analyze_graph';

const ANALYZER = i18n.translate('xpack.securitySolution.flyout.analyzer', {
  defaultMessage: 'analyzer',
});

/**
 * Analyzer graph view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const AnalyzeGraph: FC = () => {
  const { eventId } = useLeftPanelContext();
  const scopeId = 'fly-out';
  const { from, to, shouldUpdate, selectedPatterns } = useTimelineDataFilters(
    isActiveTimeline(scopeId)
  );

  if (!eventId) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{ERROR_TITLE(ANALYZER)}</h2>}
        body={<p>{ERROR_MESSAGE(ANALYZER)}</p>}
        data-test-subj={ANALYZER_GRAPH_TEST_ID}
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
        filters={{ from, to }}
      />
    </div>
  );
};

AnalyzeGraph.displayName = 'AnalyzeGraph';
