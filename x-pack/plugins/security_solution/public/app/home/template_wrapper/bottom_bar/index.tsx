/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React from 'react';
import { KibanaPageTemplateProps } from '../../../../../../../../src/plugins/kibana_react/public';
import { AppLeaveHandler } from '../../../../../../../../src/core/public';
import { useShowTimeline } from '../../../../common/utils/timeline/use_show_timeline';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { TimelineId } from '../../../../../common/types/timeline';
import { AutoSaveWarningMsg } from '../../../../timelines/components/timeline/auto_save_warning';
import { Flyout } from '../../../../timelines/components/flyout';
import { useResolveRedirect } from '../../../../common/hooks/use_resolve_redirect';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';

export const BOTTOM_BAR_CLASSNAME = 'timeline-bottom-bar';

export const SecuritySolutionBottomBar = React.memo(
  ({ onAppLeave }: { onAppLeave: (handler: AppLeaveHandler) => void }) => {
    const [showTimeline] = useShowTimeline();

    const { indicesExist, dataViewId } = useSourcererDataView(SourcererScopeName.timeline);

    useResolveRedirect();
    return (indicesExist || dataViewId === null) && showTimeline ? (
      <>
        <AutoSaveWarningMsg />
        <Flyout timelineId={TimelineId.active} onAppLeave={onAppLeave} />
      </>
    ) : null;
  }
);

export const SecuritySolutionBottomBarProps: KibanaPageTemplateProps['bottomBarProps'] = {
  className: BOTTOM_BAR_CLASSNAME,
  'data-test-subj': 'timeline-bottom-bar-container',
  position: 'fixed',
  usePortal: false,
};
