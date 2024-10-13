/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandablePanel } from '@kbn/security-solution-common';
// import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { useGraphPreview } from '../hooks/use_graph_preview';
// import { ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING } from '../../../../../common/constants';
import { useDocumentDetailsContext } from '../../shared/context';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { GraphPreview } from './graph_preview';

/**
 * Graph preview under Overview, Visualizations. It shows a graph representation of entities.
 */
export const GraphPreviewContainer: React.FC = () => {
  const { dataAsNestedObject, getFieldsData, isPreview, isPreviewMode } =
    useDocumentDetailsContext();

  // const [visualizationInFlyoutEnabled] = useUiSetting$<boolean>(
  //   ENABLE_VISUALIZATIONS_IN_FLYOUT_SETTING
  // );

  // const { navigateToAnalyzer } = useNavigateToAnalyzer({
  //   eventId,
  //   indexName,
  //   isFlyoutOpen: true,
  //   scopeId,
  // });

  // Decide whether to show the graph preview or not
  const isEnabled = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
  });
  const displayGraphPreview = isEnabled && !isPreview && !isPreviewMode;

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
      content={{
        paddingSize: 'none',
      }}
    >
      {isEnabled ? (
        <GraphPreview />
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.visualizations.graphPreview.noDataDescription"
          defaultMessage="Missing data message."
        />
      )}
    </ExpandablePanel>
  );
};

GraphPreviewContainer.displayName = 'GraphPreviewContainer';
