/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Graph } from '@kbn/cloud-security-posture-graph';
import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from './test_ids';
import { useFetchGraphData } from '../../shared/hooks/use_fetch_graph_data';
import { useDocumentDetailsContext } from '../../shared/context';
import { getFieldArray } from '../../shared/utils';

const DEFAULT_FROM = 'now-60d/d';
const DEFAULT_TO = 'now/d';

/**
 * Graph preview under Overview, Visualizations. It shows a graph without abilities to expand.
 */
export const GraphPreview: React.FC = () => {
  const { getFieldsData } = useDocumentDetailsContext();
  const eventIds = getFieldArray(getFieldsData('kibana.alert.original_event.id'));

  // TODO: default start and end might not capture the original event
  const q = useFetchGraphData({
    query: {
      actorIds: [],
      eventIds,
      start: DEFAULT_FROM,
      end: DEFAULT_TO,
    },
  });

  return q.isLoading ? (
    <EuiSkeletonText
      data-test-subj={GRAPH_PREVIEW_LOADING_TEST_ID}
      contentAriaLabel={i18n.translate(
        'xpack.securitySolution.flyout.right.visualizations.graphPreview.loadingAriaLabel',
        {
          defaultMessage: 'graph preview',
        }
      )}
    />
  ) : q.isError ? (
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
      nodes={q.data?.nodes ?? []}
      edges={q.data?.edges ?? []}
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
};

GraphPreview.displayName = 'GraphPreview';
