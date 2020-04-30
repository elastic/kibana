/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ApolloConsumer } from 'react-apollo';
import { isEmpty } from 'lodash/fp';
import { Router, Switch, Route, Redirect, useHistory } from 'react-router-dom';

import { ChromeBreadcrumb } from '../../../../../../src/core/public';

import { TimelineType } from '../../../common/types/timeline';
import { TAB_TIMELINES, TAB_TEMPLATES } from '../../components/open_timeline/translations';
import { getTimelineTabsUrl } from '../../components/link_to';
import { TimelineRouteSpyState } from '../../utils/route/types';

import { SiemPageName } from '../home/types';

import { TimelinesPage } from './timelines_page';
import { PAGE_TITLE } from './translations';
const timelinesPagePath = `/:pageName(${SiemPageName.timelines})/:tabName(${TimelineType.default}|${TimelineType.template})`;
const timelinesDefaultPath = `/${SiemPageName.timelines}/${TimelineType.default}`;

const TabNameMappedToI18nKey: Record<TimelineType, string> = {
  [TimelineType.default]: TAB_TIMELINES,
  [TimelineType.template]: TAB_TEMPLATES,
};

export const getBreadcrumbs = (
  params: TimelineRouteSpyState,
  search: string[]
): ChromeBreadcrumb[] => {
  let breadcrumb = [
    {
      text: PAGE_TITLE,
      href: `${getTimelineTabsUrl(TimelineType.default, !isEmpty(search[1]) ? search[1] : '')}`,
    },
  ];

  const tabName = params?.tabName;
  if (!tabName) return breadcrumb;

  breadcrumb = [
    ...breadcrumb,
    {
      text: TabNameMappedToI18nKey[tabName],
      href: '',
    },
  ];
  return breadcrumb;
};

export const Timelines = React.memo(() => {
  const history = useHistory();
  return (
    <Router history={history}>
      <Switch>
        <Route path={timelinesPagePath}>
          <ApolloConsumer>{client => <TimelinesPage apolloClient={client} />}</ApolloConsumer>
        </Route>
        <Redirect to={timelinesDefaultPath} />
      </Switch>
    </Router>
  );
});

Timelines.displayName = 'Timelines';
