/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FLYOUT_BUTTON_BAR_CLASS_NAME } from '../../timeline/helpers';
import { FlyoutHeaderPanel } from '../header';

interface FlyoutBottomBarProps {
  showTimelineHeaderPanel: boolean;
  timelineId: string;
}

export const FlyoutBottomBar = React.memo<FlyoutBottomBarProps>(
  ({ showTimelineHeaderPanel, timelineId }) => {
    return (
      <div className={FLYOUT_BUTTON_BAR_CLASS_NAME} data-test-subj="flyoutBottomBar">
        {showTimelineHeaderPanel && <FlyoutHeaderPanel timelineId={timelineId} />}
      </div>
    );
  }
);

FlyoutBottomBar.displayName = 'FlyoutBottomBar';
