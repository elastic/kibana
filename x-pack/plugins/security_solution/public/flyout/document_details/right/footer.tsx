/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import styled from 'styled-components';
import { euiThemeVars } from '@kbn/ui-theme';
import { DocumentDetailsIsolateHostPanelKey } from '../shared/constants/panel_keys';
import { FlyoutFooter } from '../../../timelines/components/side_panel/event_details/flyout';
import { useDocumentDetailsContext } from '../shared/context';
import { useHostIsolationTools } from '../../../timelines/components/side_panel/event_details/use_host_isolation_tools';

const ContainerDiv = styled('div')`
  .side-panel-flyout-footer {
    padding: ${euiThemeVars.euiPanelPaddingModifiers.paddingMedium};
  }
`;

interface PanelFooterProps {
  /**
   * Boolean that indicates whether flyout is in preview and action should be hidden
   */
  isPreview: boolean;
}

/**
 *
 */
export const PanelFooter: FC<PanelFooterProps> = ({ isPreview }) => {
  const { closeFlyout, openRightPanel } = useExpandableFlyoutApi();
  const {
    eventId,
    indexName,
    dataFormattedForFieldBrowser,
    dataAsNestedObject,
    refetchFlyoutData,
    scopeId,
  } = useDocumentDetailsContext();
  const { isHostIsolationPanelOpen, showHostIsolationPanel } = useHostIsolationTools();

  const showHostIsolationPanelCallback = useCallback(
    (action: 'isolateHost' | 'unisolateHost' | undefined) => {
      showHostIsolationPanel(action);
      openRightPanel({
        id: DocumentDetailsIsolateHostPanelKey,
        params: {
          id: eventId,
          indexName,
          scopeId,
          isolateAction: action,
        },
      });
    },
    [eventId, indexName, openRightPanel, scopeId, showHostIsolationPanel]
  );

  return !isPreview ? (
    <ContainerDiv>
      <FlyoutFooter
        detailsData={dataFormattedForFieldBrowser}
        detailsEcsData={dataAsNestedObject}
        handleOnEventClosed={closeFlyout}
        isHostIsolationPanelOpen={isHostIsolationPanelOpen}
        isReadOnly={false}
        loadingEventDetails={false}
        onAddIsolationStatusClick={showHostIsolationPanelCallback}
        scopeId={scopeId}
        refetchFlyoutData={refetchFlyoutData}
      />
    </ContainerDiv>
  ) : null;
};
