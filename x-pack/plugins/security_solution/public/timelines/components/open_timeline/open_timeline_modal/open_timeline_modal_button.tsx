/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

import * as i18n from '../translations';

export interface OpenTimelineModalButtonProps {
  onClick: () => void;
}

export const OpenTimelineModalButton = React.memo<OpenTimelineModalButtonProps>(({ onClick }) => (
  <EuiButtonEmpty
    color="text"
    data-test-subj="open-timeline-button"
    iconSide="left"
    iconType="folderOpen"
    onClick={onClick}
  >
    {i18n.OPEN_TIMELINE}
  </EuiButtonEmpty>
));

OpenTimelineModalButton.displayName = 'OpenTimelineModalButton';
