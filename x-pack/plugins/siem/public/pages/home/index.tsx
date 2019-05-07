/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
} from '@elastic/eui';
import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { pure } from 'recompose';
import styled from 'styled-components';
import chrome from 'ui/chrome';

import { AppSettings } from '../../components/app_settings';
import { AutoSizer } from '../../components/auto_sizer';
import { DragDropContextWrapper } from '../../components/drag_and_drop/drag_drop_context_wrapper';
import { Flyout, flyoutHeaderHeight } from '../../components/flyout';
import { HelpMenu } from '../../components/help_menu';
import { LinkToPage } from '../../components/link_to';
import { SiemNavigation } from '../../components/navigation';
import { PageHeadline } from '../../components/page_headline';
import { SuperDatePicker } from '../../components/super_date_picker';
import { StatefulTimeline } from '../../components/timeline';
import { NotFoundPage } from '../404';
import { HostsContainer } from '../hosts';
import { NetworkContainer } from '../network';
import { Overview } from '../overview';
import { Timelines } from '../timelines';

const WrappedByAutoSizer = styled.div`
  height: 100%;
`;

const usersViewing = ['elastic']; // TODO: get the users viewing this timeline from Elasticsearch (persistance)

/** Returns true if we are running with the k7 design */
const isK7Design = () => chrome.getUiSettingsClient().get('k7design');
/** the global Kibana navigation at the top of every page */
const globalHeaderHeightPx = isK7Design ? 48 : 0;

const calculateFlyoutHeight = ({
  globalHeaderSize,
  windowHeight,
}: {
  globalHeaderSize: number;
  windowHeight: number;
}): number => Math.max(0, windowHeight - globalHeaderSize);

export const HomePage = pure(() => (
  <AutoSizer detectAnyWindowResize={true} content>
    {({ measureRef, windowMeasurement: { height: windowHeight = 0 } }) => (
      <WrappedByAutoSizer data-test-subj="wrapped-by-auto-sizer" innerRef={measureRef}>
        <Page data-test-subj="pageContainer">
          <DragDropContextWrapper>
            <Flyout
              flyoutHeight={calculateFlyoutHeight({
                globalHeaderSize: globalHeaderHeightPx,
                windowHeight,
              })}
              headerHeight={flyoutHeaderHeight}
              timelineId="timeline-1"
              usersViewing={usersViewing}
            >
              <StatefulTimeline
                flyoutHeaderHeight={flyoutHeaderHeight}
                flyoutHeight={calculateFlyoutHeight({
                  globalHeaderSize: globalHeaderHeightPx,
                  windowHeight,
                })}
                id="timeline-1"
              />
            </Flyout>
            <EuiPageBody>
              <PageHeader data-test-subj="pageHeader">
                <PageHeaderSection>
                  <FixEuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
                    <EuiFlexItem grow={false}>
                      <SiemNavigation />
                      <HelpMenu />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup alignItems="center" wrap={false} gutterSize="s">
                        <EuiFlexItem grow={false} data-test-subj="datePickerContainer">
                          <SuperDatePicker id="global" />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false} data-test-subj="appSettingsContainer">
                          <AppSettings />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </FixEuiFlexGroup>
                </PageHeaderSection>
              </PageHeader>
              <PageHeadline />
              <Switch>
                <Redirect from="/" exact={true} to="/overview" />
                <Route path="/overview" component={Overview} />
                <Route path="/hosts" component={HostsContainer} />
                <Route path="/network" component={NetworkContainer} />
                <Route path="/timelines" component={Timelines} />
                <Route path="/link-to" component={LinkToPage} />
                <Route component={NotFoundPage} />
              </Switch>
            </EuiPageBody>
          </DragDropContextWrapper>
        </Page>
      </WrappedByAutoSizer>
    )}
  </AutoSizer>
));

const Page = styled(EuiPage)`
  padding: 0px 70px 24px 24px; // 70px temporary until timeline is moved - MichaelMarcialis
`;

const PageHeader = styled(EuiPageHeader)`
  background-color: ${props => props.theme.eui.euiColorLightestShade};
  position: fixed;
  width: calc(100% - 75px);
  z-index: 10;
  padding: 6px 0px 6px 0px;
  margin-bottom: 0px;
  margin-left: -1px;
  margin-top: -1px;
`;

const PageHeaderSection = styled(EuiPageHeaderSection)`
  width: 100%;
  user-select: none;
`;

const FixEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: -6px;
`;
