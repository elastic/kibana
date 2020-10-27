/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';

import { SaveTimelineComponent, SaveTimelineComponentProps } from './save_timeline';

export const SaveTimelineButton = React.memo<SaveTimelineComponentProps>(
  ({ toolTip, ...saveTimelineButtonProps }) =>
    saveTimelineButtonProps.showOverlay ? (
      <SaveTimelineComponent {...saveTimelineButtonProps} />
    ) : (
      <EuiToolTip content={toolTip || ''} data-test-subj="save-timeline-btn-tooltip">
        <SaveTimelineComponent {...saveTimelineButtonProps} />
      </EuiToolTip>
    )
);
SaveTimelineButton.displayName = 'SaveTimelineButton';
