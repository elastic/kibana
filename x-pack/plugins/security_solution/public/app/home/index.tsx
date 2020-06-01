/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import styled from 'styled-components';

import { useThrottledResizeObserver } from '../../common/components/utils';
import { DragDropContextWrapper } from '../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { Flyout } from '../../timelines/components/flyout';
import { HeaderGlobal } from '../../common/components/header_global';
import { HelpMenu } from '../../common/components/help_menu';
import { LinkToPage } from '../../common/components/link_to';
import { MlHostConditionalContainer } from '../../common/components/ml/conditional_links/ml_host_conditional_container';
import { MlNetworkConditionalContainer } from '../../common/components/ml/conditional_links/ml_network_conditional_container';
import { AutoSaveWarningMsg } from '../../timelines/components/timeline/auto_save_warning';
import { UseUrlState } from '../../common/components/url_state';
import {
  WithSource,
  indicesExistOrDataTemporarilyUnavailable,
} from '../../common/containers/source';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useShowTimeline } from '../../common/utils/timeline/use_show_timeline';
import { NotFoundPage } from '../404';
import { navTabs } from './home_navigations';
import { SiemPageName } from '../types';

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
  subPlugins: JSX.Element[];
}

export const HomePage: React.FC<HomePageProps> = ({ subPlugins }) => {
  const { ref: measureRef, height: windowHeight = 0 } = useThrottledResizeObserver();
  const flyoutHeight = useMemo(
    () =>
      calculateFlyoutHeight({
        globalHeaderSize: globalHeaderHeightPx,
        windowHeight,
      }),
    [windowHeight]
  );

  const [showTimeline] = useShowTimeline();

  return (
    <WrappedByAutoSizer data-test-subj="wrapped-by-auto-sizer" ref={measureRef}>
      <HeaderGlobal />

      <Main data-test-subj="pageContainer">
        <WithSource sourceId="default">
          {({ browserFields, indexPattern, indicesExist }) => (
            <DragDropContextWrapper browserFields={browserFields}>
              <UseUrlState indexPattern={indexPattern} navTabs={navTabs} />
              {indicesExistOrDataTemporarilyUnavailable(indicesExist) && showTimeline && (
                <>
                  <AutoSaveWarningMsg />
                  <Flyout
                    flyoutHeight={flyoutHeight}
                    timelineId="timeline-1"
                    usersViewing={usersViewing}
                  />
                </>
              )}

              <Switch>
                <Redirect exact from="/" to={`/${SiemPageName.overview}`} />
                {subPlugins}
                <Route path="/link-to" render={(props) => <LinkToPage {...props} />} />
                <Route
                  path="/ml-hosts"
                  render={({ location, match }) => (
                    <MlHostConditionalContainer location={location} url={match.url} />
                  )}
                />
                <Route
                  path="/ml-network"
                  render={({ location, match }) => (
                    <MlNetworkConditionalContainer location={location} url={match.url} />
                  )}
                />
                <Route render={() => <NotFoundPage />} />
              </Switch>
            </DragDropContextWrapper>
          )}
        </WithSource>
      </Main>

      <HelpMenu />

      <SpyRoute />
    </WrappedByAutoSizer>
  );
};

HomePage.displayName = 'HomePage';
