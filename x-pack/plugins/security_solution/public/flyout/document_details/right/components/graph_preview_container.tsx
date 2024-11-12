/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import { useDocumentDetailsContext } from '../../shared/context';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { GraphPreview } from './graph_preview';
import { useFetchGraphData } from '../hooks/use_fetch_graph_data';
import { useGraphPreview } from '../hooks/use_graph_preview';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { getField } from '../../shared/utils';

/**
 * Graph preview under Overview, Visualizations. It shows a graph representation of entities.
 */
export const GraphPreviewContainer: React.FC = () => {
  const { dataAsNestedObject, getFieldsData } = useDocumentDetailsContext();

  const { eventIds } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
  });

  // Moment(null) will result null in timestamp, when timestamp is missing we wish to default to undefined
  // so that the graph will show the default time range now+30m and now-30m
  const timestamp = getField(getFieldsData('@timestamp')) ?? undefined;

  // TODO: default start and end might not capture the original event
  const { isLoading, isError, data } = useFetchGraphData({
    req: {
      query: {
        eventIds,
        start: moment(timestamp).subtract(30, 'minutes').toISOString(),
        end: moment(timestamp).add(30, 'minutes').toISOString(),
      },
    },
    options: {
      refetchOnWindowFocus: false,
    },
  });

  return (
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
  );
};

GraphPreviewContainer.displayName = 'GraphPreviewContainer';
