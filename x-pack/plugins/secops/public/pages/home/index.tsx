/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHorizontalRule,
  // @ts-ignore
  EuiSearchBar,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { pure } from 'recompose';

import { LinkToPage } from '../../components/link_to';
import {
  PageContainer,
  PageContent,
  PageHeader,
  Pane,
  PaneHeader,
  PaneScrollContainer,
  SubHeader,
  SubHeaderDatePicker,
} from '../../components/page';
import { DatePicker } from '../../components/page/date_picker';
import { Flyout } from '../../components/page/flyout';
import { Footer } from '../../components/page/footer';
import { Navigation } from '../../components/page/navigation';
import { StatefulTimeline } from '../../components/timeline';
import { headers } from '../../components/timeline/body/column_headers/headers';
import { NotFoundPage } from '../404';
import { Hosts } from '../hosts';
import { Network } from '../network';
import { Overview } from '../overview';

const maxTimelineWidth = 1125;

export const HomePage = pure(() => (
  <PageContainer data-test-subj="pageContainer">
    <Flyout>
      <StatefulTimeline id="timeline" headers={headers} width={maxTimelineWidth} />
    </Flyout>
    <PageHeader data-test-subj="pageHeader">
      <Navigation data-test-subj="navigation" />
    </PageHeader>
    <PageContent data-test-subj="pageContent">
      <SubHeader data-test-subj="subHeader">
        <SubHeaderDatePicker data-test-subj="datePickerContainer">
          <DatePicker />
        </SubHeaderDatePicker>
        <EuiHorizontalRule margin="none" />
      </SubHeader>
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
  </PageContainer>
));
