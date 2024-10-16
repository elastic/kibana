/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Graph } from '@kbn/cloud-security-posture-graph';
import type {
  NodeDataModel,
  EdgeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from './test_ids';

/**
 * Props for the GraphPreview component.
 */
export interface GraphPreviewProps {
  /**
   * Indicates whether the graph is currently loading.
   */
  isLoading: boolean;

  /**
   * Indicates whether there was an error loading the graph.
   */
  isError: boolean;

  /**
   * Optional data for the graph, including nodes and edges.
   */
  data?: {
    /**
     * Array of node data models.
     */
    nodes: NodeDataModel[];

    /**
     * Array of edge data models.
     */
    edges: EdgeDataModel[];
  };
}

/**
 * Graph preview under Overview, Visualizations. It shows a graph without abilities to expand.
 */
export const GraphPreview: React.FC<GraphPreviewProps> = memo(
  ({ isLoading, isError, data }: GraphPreviewProps) => {
    return isLoading ? (
      <EuiSkeletonText
        data-test-subj={GRAPH_PREVIEW_LOADING_TEST_ID}
        contentAriaLabel={i18n.translate(
          'xpack.securitySolution.flyout.right.visualizations.graphPreview.loadingAriaLabel',
          {
            defaultMessage: 'graph preview',
          }
        )}
      />
    ) : isError ? (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.visualizations.graphPreview.errorDescription"
        defaultMessage="An error is preventing this alert from being visualized."
      />
    ) : (
      <Graph
        css={css`
          height: 300px;
          width: 100%;
        `}
        nodes={data?.nodes ?? []}
        edges={data?.edges ?? []}
        interactive={false}
        aria-label={i18n.translate(
          'xpack.securitySolution.flyout.right.visualizations.graphPreview.graphAriaLabel',
          {
            defaultMessage: 'Graph preview',
          }
        )}
        data-test-subj={GRAPH_PREVIEW_TEST_ID}
      />
    );
  }
);

GraphPreview.displayName = 'GraphPreview';
