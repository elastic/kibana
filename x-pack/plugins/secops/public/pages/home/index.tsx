/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore: EuiBreadcrumbs has no exported member
  EuiBreadcrumbs,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  // @ts-ignore
  EuiSearchBar,
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
import { LinkToPage } from '../../components/link_to';
import { Navigation } from '../../components/page/navigation';
import { RangeDatePicker } from '../../components/range_date_picker';
import { StatefulTimeline } from '../../components/timeline';
import { headers } from '../../components/timeline/body/column_headers/headers';
import { NotFoundPage } from '../404';
import { HostsContainer } from '../hosts';
import { getBreadcrumbs } from '../hosts/host_details';
import { Network } from '../network';
import { Overview } from '../overview';

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

export const HomePage = pure(() => (
  <AutoSizer detectAnyWindowResize={true} content>
    {({ measureRef, windowMeasurement: { height: windowHeight = 0 } }) => (
      <WrappedByAutoSizer data-test-subj="wrapped-by-auto-sizer" innerRef={measureRef}>
        <Page data-test-subj="pageContainer">
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
            <EuiPageBody>
              <PageHeader data-test-subj="pageHeader">
                <PageHeaderSection>
                  <FixEuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
                    <EuiFlexItem grow={false} data-test-subj="datePickerContainer">
                      {window.location.hash.match(/[hosts|overview|network]\?/) && (
                        <Navigation data-test-subj="navigation" />
                      )}
                      {window.location.hash.match(/hosts\/.*?/) !== null && (
                        <EuiBreadcrumbs
                          breadcrumbs={getBreadcrumbs(
                            window.location.hash.match(/\/([^/]*)\?/)![1]
                          )}
                        />
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup alignItems="center" wrap={false} gutterSize="s">
                        <EuiFlexItem grow={false} data-test-subj="datePickerContainer">
                          <RangeDatePicker id="global" />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false} data-test-subj="appSettingsContainer">
                          <AppSettings />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </FixEuiFlexGroup>
                </PageHeaderSection>
              </PageHeader>
              <Switch>
                <Redirect from="/" exact={true} to="/overview" />
                <Route path="/overview" component={Overview} />
                <Route path="/hosts" component={HostsContainer} />
                <Route path="/network" component={Network} />
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
  padding: 0px 16px 16px 16px;
`;

const PageHeader = styled(EuiPageHeader)`
  background-color: ${props => props.theme.eui.euiColorLightestShade};
  position: fixed;
  width: calc(100% - 30px);
  z-index: 1;
  padding: 6px 0px 6px 0px;
  margin-bottom: 0px;
  margin-left: -1px;
  margin-top: -1px;
`;

const PageHeaderSection = styled(EuiPageHeaderSection)`
  width: 100%;
`;

const FixEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: -6px;
`;
