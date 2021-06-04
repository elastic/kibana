/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { useRef } from 'react';
import { KibanaPageTemplateProps } from '../../../../../../../../src/plugins/kibana_react/public';
import { useKibana } from '../../../../common/lib/kibana';
import { useShowTimeline } from '../../../../common/utils/timeline/use_show_timeline';
import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { DETECTIONS_SUB_PLUGIN_ID } from '../../../../../common/constants';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { TimelineId } from '../../../../../common/types/timeline';
import { AutoSaveWarningMsg } from '../../../../timelines/components/timeline/auto_save_warning';
import { Flyout } from '../../../../timelines/components/flyout';
import { useAppMountContext } from '../../../../app/app_mount_context';

export const BOTTOM_BAR_CLASSNAME = 'timeline-bottom-bar';

export const SecuritySolutionBottomBar = React.memo(() => {
  const subPluginId = useRef<string>('');
  const { onAppLeave } = useAppMountContext();
  const { application } = useKibana().services;
  application.currentAppId$.subscribe((appId) => {
    subPluginId.current = appId ?? '';
  });

  const [showTimeline] = useShowTimeline();

  const { indicesExist } = useSourcererScope(
    subPluginId.current === DETECTIONS_SUB_PLUGIN_ID
      ? SourcererScopeName.detections
      : SourcererScopeName.default
  );

  return indicesExist && showTimeline ? (
    <>
      <AutoSaveWarningMsg />
      <Flyout timelineId={TimelineId.active} onAppLeave={onAppLeave} />
    </>
  ) : null;
});

export const SecuritySolutionBottomBarProps: KibanaPageTemplateProps['bottomBarProps'] = {
  className: BOTTOM_BAR_CLASSNAME,
  position: 'fixed',
  usePortal: false,
};
