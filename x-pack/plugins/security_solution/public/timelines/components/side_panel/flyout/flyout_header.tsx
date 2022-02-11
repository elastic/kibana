/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EventDetailsBackToAlertDetailsLink } from '../event_details/back_link';
import { ACTION_OSQUERY } from '../../../../detections/components/take_action_dropdown/osquery_action_item';
import {
  ISOLATE_HOST,
  UNISOLATE_HOST,
} from '../../../../detections/components/host_isolation/translations';
import { ExpandableEventTitle } from '../event_details/expandable_event';
import { ACTIVE_PANEL } from '../event_details';

interface IProps {
  activePanel: ACTIVE_PANEL | null;
  isAlert: boolean;
  isolateAction: string;
  loading: boolean;
  ruleName?: string;
  showAlertDetails: () => void;
  timestamp: string;
}

const EventDetailsFlyoutHeaderComponent: React.FC<IProps> = ({
  activePanel,
  isAlert,
  isolateAction,
  loading,
  ruleName,
  showAlertDetails,
  timestamp,
}) => {
  switch (activePanel) {
    case ACTIVE_PANEL.OSQUERY:
      return (
        <EventDetailsBackToAlertDetailsLink
          primaryText={<h2>{ACTION_OSQUERY}</h2>}
          onClick={showAlertDetails}
        />
      );
    case ACTIVE_PANEL.HOST_ISOLATION:
      return (
        <EventDetailsBackToAlertDetailsLink
          primaryText={<h2>{isolateAction === 'isolateHost' ? ISOLATE_HOST : UNISOLATE_HOST}</h2>}
          onClick={showAlertDetails}
        />
      );
    default:
      return (
        <ExpandableEventTitle
          isAlert={isAlert}
          loading={loading}
          ruleName={ruleName}
          timestamp={timestamp}
        />
      );
  }
};

export const EventDetailsFlyoutHeader = React.memo(EventDetailsFlyoutHeaderComponent);
