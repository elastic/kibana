/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { VisualizePanel } from '../../../../common/store/flyout/model';
import { AnalyzeEvent, ANALYZE_EVENT_ID } from './analyze_event';
import { VisualizeNavigation } from './navigation';
import { SessionView, SESSION_VIEW_ID } from './session_view';

export const EventVisualizePanelKey: VisualizePanel['panelKind'] = 'visualize';

export const EventVisualizePanel: React.FC = React.memo(() => {
  const [activeVisualizationId, setActiveVisualizationId] = useState(ANALYZE_EVENT_ID);
  return (
    <>
      <VisualizeNavigation
        activeVisualizationId={activeVisualizationId}
        setActiveVisualizationId={setActiveVisualizationId}
      />
      {activeVisualizationId === ANALYZE_EVENT_ID && <AnalyzeEvent />}
      {activeVisualizationId === SESSION_VIEW_ID && <SessionView />}
      {/* <FlyoutBody
        alertId={alertId}
        browserFields={browserFields}
        detailsData={detailsData}
        detailsEcsData={ecsData}
        event={expandedEvent}
        hostName={hostName}
        handleIsolationActionSuccess={handleIsolationActionSuccess}
        handleOnEventClosed={handleOnEventClosed}
        isAlert={isAlert}
        isDraggable={isDraggable}
        isolateAction={isolateAction}
        isIsolateActionSuccessBannerVisible={isIsolateActionSuccessBannerVisible}
        isHostIsolationPanelOpen={isHostIsolationPanelOpen}
        loading={loading}
        rawEventData={rawEventData}
        showAlertDetails={showAlertDetails}
        scopeId={scopeId}
        isReadOnly={isReadOnly}
      />
      <FlyoutFooter
        detailsData={detailsData}
        detailsEcsData={ecsData}
        expandedEvent={expandedEvent}
        refetchFlyoutData={refetchFlyoutData}
        handleOnEventClosed={handleOnEventClosed}
        isHostIsolationPanelOpen={isHostIsolationPanelOpen}
        isReadOnly={isReadOnly}
        loadingEventDetails={loading}
        onAddIsolationStatusClick={showHostIsolationPanel}
        scopeId={scopeId}
      /> */}
    </>
  );
});

EventVisualizePanel.displayName = 'EventDetailsPanel';
