/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiCode } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';

export const TIMELINE_TOUR_CONFIG_ANCHORS = {
  ACTION_MENU: 'timeline-action-menu',
  DATA_VIEW: 'timeline-data-view',
  DATA_PROVIDER: 'toggle-data-provider',
  SAVE_TIMELINE: 'save-timeline-action',
};

export const timelineTourSteps = [
  {
    step: 1,
    title: i18n.TIMELINE_TOUR_TIMELINE_ACTIONS_STEP_TITLE,
    content: (
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.timeline.tour.newTimeline.description"
          defaultMessage="Click {newButton} to create a new timeline. Click {openButton} to open an existing one"
          values={{
            newButton: <EuiCode>{i18n.TIMELINE_TOUR_NEW}</EuiCode>,
            openButton: <EuiCode>{i18n.TIMELINE_TOUR_OPEN}</EuiCode>,
          }}
        />
      </EuiText>
    ),
    anchor: TIMELINE_TOUR_CONFIG_ANCHORS.ACTION_MENU,
  },
  {
    step: 2,
    title: i18n.TIMELINE_TOUR_CHANGE_DATA_VIEW_TITLE,
    content: (
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.timeline.tour.changeDataView.description"
          defaultMessage="Click the {dataViewButton} menu to choose the event or alert data that you want to display"
          values={{
            dataViewButton: <EuiCode> {i18n.TIMELINE_TOUR_DATA_VIEW}</EuiCode>,
          }}
        />
      </EuiText>
    ),
    anchor: TIMELINE_TOUR_CONFIG_ANCHORS.DATA_VIEW,
  },
  {
    step: 3,
    title: i18n.TIMELINE_TOUR_DATA_PROVIDER_VISIBILITY_TITLE,
    content: <EuiText>{i18n.TIMELINE_TOUR_DATA_PROVIDER_VISIBILITY_DESCRIPTION}</EuiText>,
    anchor: TIMELINE_TOUR_CONFIG_ANCHORS.DATA_PROVIDER,
  },
  {
    step: 4,
    title: i18n.TIMELINE_TOUR_SAVE_TIMELINE_STEP_TITLE,
    content: (
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.timeline.tour.saveTimeline.description"
          defaultMessage="Click {saveButton} to manually save new changes. While saving your Timeline, you can {editButton} its name and description or save it as a new Timeline"
          values={{
            saveButton: <EuiCode>{i18n.TIMELINE_TOUR_SAVE}</EuiCode>,
            editButton: <EuiCode>{i18n.TIMELINE_TOUR_EDIT}</EuiCode>,
          }}
        />
      </EuiText>
    ),
    anchor: TIMELINE_TOUR_CONFIG_ANCHORS.SAVE_TIMELINE,
  },
];

export const tourConfig = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 300,
  tourSubtitle: i18n.TIMELINE_TOUR_SUBTITLE,
};
