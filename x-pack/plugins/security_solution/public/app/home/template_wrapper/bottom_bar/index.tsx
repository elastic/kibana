/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React from 'react';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-components';
import type { AppLeaveHandler } from '@kbn/core/public';
import { TimelineId } from '../../../../../common/types/timeline';
import { AutoSaveWarningMsg } from '../../../../timelines/components/timeline/auto_save_warning';
import { Flyout } from '../../../../timelines/components/flyout';
import { useResolveRedirect } from '../../../../common/hooks/use_resolve_redirect';

export const BOTTOM_BAR_CLASSNAME = 'timeline-bottom-bar';

export const SecuritySolutionBottomBar = React.memo(
  ({ onAppLeave }: { onAppLeave: (handler: AppLeaveHandler) => void }) => {
    useResolveRedirect();
    return (
      <>
        <AutoSaveWarningMsg />
        <Flyout timelineId={TimelineId.active} onAppLeave={onAppLeave} />
      </>
    );
  }
);

export const SecuritySolutionBottomBarProps: KibanaPageTemplateProps['bottomBarProps'] = {
  className: BOTTOM_BAR_CLASSNAME,
  'data-test-subj': 'timeline-bottom-bar-container',
  position: 'fixed',
  usePortal: false,
};
