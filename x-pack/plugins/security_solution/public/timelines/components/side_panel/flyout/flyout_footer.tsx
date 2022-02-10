/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { OsqueryEventDetailsFooter } from '../../osquery/footer';
import { EventDetailsFooter } from '../event_details/footer';
import { ACTIVE_PANEL } from '../event_details';
import { TimelineEventsDetailsItem } from '../../../../../../timelines/common';
import { Ecs } from '../../../../../common/ecs';

interface IProps {
  activePanel: ACTIVE_PANEL | null;
  detailsData: TimelineEventsDetailsItem[] | null;
  ecsData: Ecs | null;
  expandedEvent: {
    eventId: string;
    indexName: string;
    refetch?: () => void;
  };
  handleOnEventClosed: () => void;
  loading: boolean;
  showAlertDetails: () => void;
  showHostIsolationPanel: (action: string) => void;
  timelineId: string;
  setActivePanel: (panel: ACTIVE_PANEL | null) => void;
}

const EventDetailsFlyoutFooterComponent: React.FC<IProps> = ({
  activePanel,
  detailsData,
  ecsData,
  expandedEvent,
  handleOnEventClosed,
  loading,
  showAlertDetails,
  showHostIsolationPanel,
  timelineId,
  setActivePanel,
}) => {
  const handlePanelChange = (panelType: ACTIVE_PANEL | null) => {
    if (activePanel === ACTIVE_PANEL.OSQUERY && panelType === null) {
      showAlertDetails();
    } else {
      setActivePanel(panelType);
    }
  };
  switch (activePanel) {
    case ACTIVE_PANEL.OSQUERY:
      return <OsqueryEventDetailsFooter handlePanelChange={handlePanelChange} />;
    default:
      return (
        <EventDetailsFooter
          detailsData={detailsData}
          detailsEcsData={ecsData}
          expandedEvent={expandedEvent}
          handleOnEventClosed={handleOnEventClosed}
          isHostIsolationPanelOpen={activePanel === ACTIVE_PANEL.HOST_ISOLATION}
          loadingEventDetails={loading}
          onAddIsolationStatusClick={showHostIsolationPanel}
          timelineId={timelineId}
          handlePanelChange={handlePanelChange}
        />
      );
  }
};

export const EventDetailsFlyoutFooter = React.memo(EventDetailsFlyoutFooterComponent);
