/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDocumentDetailsContext } from '../../shared/context';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { GraphPreview } from './graph_preview';
import { useFetchGraphData } from '../hooks/use_fetch_graph_data';
import { useGraphPreview } from '../hooks/use_graph_preview';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';

/**
 * Graph preview under Overview, Visualizations. It shows a graph representation of entities.
 */
export const GraphPreviewContainer: React.FC = () => {
  const { dataAsNestedObject, getFieldsData } = useDocumentDetailsContext();

  const {
    eventIds,
    timestamp = new Date().toISOString(),
    isAuditLog,
  } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
  });

  // TODO: default start and end might not capture the original event
  const { isLoading, isError, data } = useFetchGraphData({
    req: {
      query: {
        eventIds,
        start: `${timestamp}||-30m`,
        end: `${timestamp}||+30m`,
      },
    },
    options: {
      enabled: isAuditLog,
      refetchOnWindowFocus: false,
    },
  });

  return (
    isAuditLog && (
      <ExpandablePanel
        header={{
          title: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.visualizations.graphPreview.graphPreviewTitle"
              defaultMessage="Graph preview"
            />
          ),
          iconType: 'indexMapping',
        }}
        data-test-subj={GRAPH_PREVIEW_TEST_ID}
        content={
          !isLoading && !isError
            ? {
                paddingSize: 'none',
              }
            : undefined
        }
      >
        <GraphPreview isLoading={isLoading} isError={isError} data={data} />
      </ExpandablePanel>
    )
  );
};

GraphPreviewContainer.displayName = 'GraphPreviewContainer';
