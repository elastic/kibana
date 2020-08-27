/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

import { TimelineId } from '../../../common/types/timeline';
import { DragDropContextWrapper } from '../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { Flyout } from '../../timelines/components/flyout';
import { HeaderGlobal } from '../../common/components/header_global';
import { HelpMenu } from '../../common/components/help_menu';
import { AutoSaveWarningMsg } from '../../timelines/components/timeline/auto_save_warning';
import { UseUrlState } from '../../common/components/url_state';
import { useWithSource } from '../../common/containers/source';
import { useShowTimeline } from '../../common/utils/timeline/use_show_timeline';
import { navTabs } from './home_navigations';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { useUserInfo } from '../../detections/components/user_info';

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
  const { signalIndexExists, signalIndexName } = useSignalIndex();

  const indexToAdd = useMemo<string[] | null>(() => {
    if (signalIndexExists && signalIndexName != null) {
      return [signalIndexName];
    }
    return null;
  }, [signalIndexExists, signalIndexName]);

  const [showTimeline] = useShowTimeline();
  const { browserFields, indexPattern, indicesExist } = useWithSource('default', indexToAdd);

  // side effect: this will attempt to create the signals index if it doesn't exist
  useUserInfo();

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
