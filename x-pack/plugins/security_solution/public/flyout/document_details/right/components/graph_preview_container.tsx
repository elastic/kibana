/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING } from '../../../../../common/constants';
import { useDocumentDetailsContext } from '../../shared/context';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { GraphPreview } from './graph_preview';
import { useFetchGraphData } from '../hooks/use_fetch_graph_data';
import { useGraphPreview } from '../hooks/use_graph_preview';
import { useNavigateToGraphVisualization } from '../../shared/hooks/use_navigate_to_graph_visualization';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';

/**
 * Graph preview under Overview, Visualizations. It shows a graph representation of entities.
 */
export const GraphPreviewContainer: React.FC = () => {
  const { dataAsNestedObject, getFieldsData, eventId, indexName, scopeId } =
    useDocumentDetailsContext();

  const [visualizationInFlyoutEnabled] = useUiSetting$<boolean>(
    ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING
  );

  const { navigateToGraphVisualization } = useNavigateToGraphVisualization({
    eventId,
    indexName,
    isFlyoutOpen: true,
    scopeId,
  });

  const {
    eventIds,
    timestamp = new Date().toISOString(),
    isAuditLog,
  } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
  });

  const timestamp = getFieldsData('@timestamp')[0];

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
          iconType: visualizationInFlyoutEnabled ? 'arrowStart' : 'indexMapping',
          ...(visualizationInFlyoutEnabled && {
            link: {
              callback: navigateToGraphVisualization,
              tooltip: (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.visualizations.graphPreview.graphPreviewOpenGraphTooltip"
                  defaultMessage="Expand graph"
                />
              ),
            },
          }),
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
