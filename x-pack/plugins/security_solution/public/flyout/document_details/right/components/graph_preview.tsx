/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
// import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from './test_ids';
// import type { StatsNode } from '../../shared/hooks/use_alert_prevalence_from_process_tree';
import { GraphView, GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from '@kbn/cloud-security-posture';

// const CHILD_COUNT_LIMIT = 3;
// const ANCESTOR_LEVEL = 3;
// const DESCENDANT_LEVEL = 3;

// /**
//  * Cache that stores fetched stats nodes
//  */
// interface Cache {
//   statsNodes: StatsNode[];
// }

/**
 * Graph preview under Overview, Visualizations. It shows a graph representation of alert.
 */
export const GraphPreview: React.FC = () => {
  const loading = false;
  const success = true;

  return loading ? (
    <EuiSkeletonText
      data-test-subj={GRAPH_PREVIEW_LOADING_TEST_ID}
      contentAriaLabel={i18n.translate(
        'xpack.securitySolution.flyout.right.visualizations.graphPreview.loadingAriaLabel',
        {
          defaultMessage: 'graph preview',
        }
      )}
    />
  ) : success ? (
    <GraphView
    kuery=''
    start=''
    end='' />
  ) : (
    <FormattedMessage
      id="xpack.securitySolution.flyout.right.visualizations.graphPreview.errorDescription"
      defaultMessage="An error is preventing this alert from being visualized."
    />
  );
};

GraphPreview.displayName = 'GraphPreview';
