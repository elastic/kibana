/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

import { useThrottledResizeObserver } from '../../common/components/utils';
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

const WrappedByAutoSizer = styled.div`
  height: 100%;
`;
WrappedByAutoSizer.displayName = 'WrappedByAutoSizer';

const Main = styled.main`
  height: 100%;
`;
Main.displayName = 'Main';

const usersViewing = ['elastic']; // TODO: get the users viewing this timeline from Elasticsearch (persistance)

/** the global Kibana navigation at the top of every page */
const globalHeaderHeightPx = 48;

const calculateFlyoutHeight = ({
  globalHeaderSize,
  windowHeight,
}: {
  globalHeaderSize: number;
  windowHeight: number;
}): number => Math.max(0, windowHeight - globalHeaderSize);

interface HomePageProps {
  children: React.ReactNode;
}

export const HomePage: React.FC<HomePageProps> = ({ children }) => {
  const { ref: measureRef, height: windowHeight = 0 } = useThrottledResizeObserver();
  const flyoutHeight = useMemo(
    () =>
      calculateFlyoutHeight({
        globalHeaderSize: globalHeaderHeightPx,
        windowHeight,
      }),
    [windowHeight]
  );
  const { signalIndexExists, signalIndexName } = useSignalIndex();

  const indexToAdd = useMemo<string[] | null>(() => {
    if (signalIndexExists && signalIndexName != null) {
      return [signalIndexName];
    }
    return null;
  }, [signalIndexExists, signalIndexName]);

  const [showTimeline] = useShowTimeline();
  const { browserFields, indexPattern, indicesExist } = useWithSource('default', indexToAdd);

  return (
    <WrappedByAutoSizer data-test-subj="wrapped-by-auto-sizer" ref={measureRef}>
      <HeaderGlobal />

      <Main data-test-subj="pageContainer">
        <DragDropContextWrapper browserFields={browserFields}>
          <UseUrlState indexPattern={indexPattern} navTabs={navTabs} />
          {indicesExist && showTimeline && (
            <>
              <AutoSaveWarningMsg />
              <Flyout
                flyoutHeight={flyoutHeight}
                timelineId="timeline-1"
                usersViewing={usersViewing}
              />
            </>
          )}

          {children}
        </DragDropContextWrapper>
      </Main>

      <HelpMenu />
    </WrappedByAutoSizer>
  );
};

HomePage.displayName = 'HomePage';
