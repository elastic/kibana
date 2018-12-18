/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiSearchBar,
} from '@elastic/eui';
import * as darkTheme from '@elastic/eui/dist/eui_theme_k6_dark.json';
import * as lightTheme from '@elastic/eui/dist/eui_theme_k6_light.json';

import { defaultTo, noop } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';
import { Redirect, Route, Switch } from 'react-router-dom';
import { pure } from 'recompose';
import { Dispatch } from 'redux';
import styled, { ThemeProvider } from 'styled-components';
import chrome from 'ui/chrome';

import { AutoSizer } from '../../components/auto_sizer';
import { DragDropContextWrapper } from '../../components/drag_and_drop/drag_drop_context_wrapper';
import { Flyout, flyoutHeaderHeight } from '../../components/flyout';
import { LinkToPage } from '../../components/link_to';
import {
  PageContainer,
  PageContent,
  PageHeader,
  Pane,
  PaneHeader,
  PaneScrollContainer,
} from '../../components/page';
import { Footer } from '../../components/page/footer';
import { Navigation } from '../../components/page/navigation';
import { RangeDatePicker } from '../../components/range_date_picker';
import { StatefulTimeline } from '../../components/timeline';
import { headers } from '../../components/timeline/body/column_headers/headers';
import { themeSelector } from '../../store/local/app';
import { Theme } from '../../store/local/app/model';
import { State } from '../../store/reducer';
import { NotFoundPage } from '../404';
import { Hosts } from '../hosts';
import { Network } from '../network';
import { Overview } from '../overview';

const themes: { [key in Theme]: object } = {
  dark: darkTheme,
  light: lightTheme,
};

interface Props {
  dispatch: Dispatch;
  theme?: Theme;
}

const WrappedByAutoSizer = styled.div`
  height: 100%;
`;

/** Returns true if we are running with the k7 design */
const isK7Design = () => chrome.getUiSettingsClient().get('k7design');
/** the global Kibana navigation at the top of every page */
const globalHeaderHeightPx = isK7Design ? 65 : 0;
/** Additional padding applied by EuiFlyout */
const additionalEuiFlyoutPadding = 45;

const calculateFlyoutHeight = ({
  additionalFlyoutPadding,
  globalHeaderSize,
  windowHeight,
}: {
  additionalFlyoutPadding: number;
  globalHeaderSize: number;
  windowHeight: number;
}): number => Math.max(0, windowHeight - (globalHeaderSize + additionalFlyoutPadding));

const HomePageComponent = pure<Props>(({ theme }) => (
  <ThemeProvider theme={{ eui: themes[theme!] }}>
    <AutoSizer detectAnyWindowResize={true} content>
      {({ measureRef, windowMeasurement: { height: windowHeight = 0 } }) => (
        <WrappedByAutoSizer data-test-subj="wrapped-by-auto-sizer" innerRef={measureRef}>
          <PageContainer data-test-subj="pageContainer">
            <DragDropContextWrapper>
              <Flyout
                flyoutHeight={calculateFlyoutHeight({
                  additionalFlyoutPadding: additionalEuiFlyoutPadding,
                  globalHeaderSize: globalHeaderHeightPx,
                  windowHeight,
                })}
                headerHeight={flyoutHeaderHeight}
                timelineId="timeline-1"
              >
                <StatefulTimeline
                  flyoutHeaderHeight={flyoutHeaderHeight}
                  flyoutHeight={calculateFlyoutHeight({
                    additionalFlyoutPadding: additionalEuiFlyoutPadding,
                    globalHeaderSize: globalHeaderHeightPx,
                    windowHeight,
                  })}
                  id="timeline-1"
                  headers={headers}
                />
              </Flyout>
              <MyEuiFlexGroup justifyContent="flexEnd" alignItems="center">
                <EuiFlexItem grow={false} data-test-subj="datePickerContainer">
                  <RangeDatePicker id="global" />
                </EuiFlexItem>
              </MyEuiFlexGroup>
              <PageHeader data-test-subj="pageHeader">
                <Navigation data-test-subj="navigation" />
              </PageHeader>
              <PageContent data-test-subj="pageContent">
                <Pane data-test-subj="pane">
                  <PaneHeader data-test-subj="paneHeader">
                    <EuiSearchBar onChange={noop} />
                  </PaneHeader>
                  <PaneScrollContainer data-test-subj="pane1ScrollContainer">
                    <Switch>
                      <Redirect from="/" exact={true} to="/overview" />
                      <Route path="/overview" component={Overview} />
                      <Route path="/hosts" component={Hosts} />
                      <Route path="/network" component={Network} />
                      <Route path="/link-to" component={LinkToPage} />
                      <Route component={NotFoundPage} />
                    </Switch>
                  </PaneScrollContainer>
                </Pane>
              </PageContent>
              <Footer />
            </DragDropContextWrapper>
          </PageContainer>
        </WrappedByAutoSizer>
      )}
    </AutoSizer>
  </ThemeProvider>
));

const mapStateToProps = (state: State) => ({
  theme: defaultTo('dark', themeSelector(state)),
});

export const HomePage = connect(mapStateToProps)(HomePageComponent);

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  margin: 2px 0px;
`;
