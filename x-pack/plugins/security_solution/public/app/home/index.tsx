/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef } from 'react';
import styled from 'styled-components';

import { TimelineId } from '../../../common/types/timeline';
import { DragDropContextWrapper } from '../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { Flyout } from '../../timelines/components/flyout';
import { HeaderGlobal } from '../../common/components/header_global';
import { HelpMenu } from '../../common/components/help_menu';
import { AutoSaveWarningMsg } from '../../timelines/components/timeline/auto_save_warning';
import { UseUrlState } from '../../common/components/url_state';
import { useShowTimeline } from '../../common/utils/timeline/use_show_timeline';
import { navTabs } from './home_navigations';
import { useInitSourcerer, useSourcererScope } from '../../common/containers/sourcerer';
import { useKibana } from '../../common/lib/kibana';
import { DETECTIONS_SUB_PLUGIN_ID } from '../../../common/constants';
import { SourcererScopeName } from '../../common/store/sourcerer/model';

const SecuritySolutionAppWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
`;
SecuritySolutionAppWrapper.displayName = 'SecuritySolutionAppWrapper';

const Main = styled.main`
  overflow: auto;
  flex: 1;
`;

Main.displayName = 'Main';

const usersViewing = ['elastic']; // TODO: get the users viewing this timeline from Elasticsearch (persistance)

interface HomePageProps {
  children: React.ReactNode;
}

const HomePageComponent: React.FC<HomePageProps> = ({ children }) => {
  const kibana = useKibana();
  const subPluginId = useRef<string>('');

  const { application } = kibana.services;
  application.currentAppId$.subscribe((appId) => {
    subPluginId.current = appId ?? '';
  });

  useInitSourcerer(
    subPluginId.current === DETECTIONS_SUB_PLUGIN_ID
      ? SourcererScopeName.detections
      : SourcererScopeName.default
  );
  const [showTimeline] = useShowTimeline();

  const { browserFields, indexPattern, indicesExist } = useSourcererScope();

  return (
    <SecuritySolutionAppWrapper>
      <HeaderGlobal />

      <Main data-test-subj="pageContainer">
        <DragDropContextWrapper browserFields={browserFields}>
          <UseUrlState indexPattern={indexPattern} navTabs={navTabs} />
          {indicesExist && showTimeline && (
            <>
              <AutoSaveWarningMsg />
              <Flyout timelineId={TimelineId.active} usersViewing={usersViewing} />
            </>
          )}

          {children}
        </DragDropContextWrapper>
      </Main>

      <HelpMenu />
    </SecuritySolutionAppWrapper>
  );
};

HomePageComponent.displayName = 'HomePage';

export const HomePage = React.memo(HomePageComponent);
