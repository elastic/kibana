/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiText } from '@elastic/eui';
import { ANALYZER_GRAPH_TEST_ID } from './test_ids';

export const ANALYZE_GRAPH_ID = 'analyze_graph';

/**
 * Analyzer graph view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const AnalyzeGraph: FC = () => {
  return <EuiText data-test-subj={ANALYZER_GRAPH_TEST_ID}>{'Analyzer graph'}</EuiText>;
};

AnalyzeGraph.displayName = 'AnalyzeGraph';
