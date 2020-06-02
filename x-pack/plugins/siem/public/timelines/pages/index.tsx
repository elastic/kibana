/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ApolloConsumer } from 'react-apollo';
import { Switch, Route, Redirect } from 'react-router-dom';

import { ChromeBreadcrumb } from '../../../../../../src/core/public';

import { TimelineType } from '../../../common/types/timeline';
import { TAB_TIMELINES, TAB_TEMPLATES } from '../components/open_timeline/translations';
import { getTimelinesUrl } from '../../common/components/link_to';
import { TimelineRouteSpyState } from '../../common/utils/route/types';

import { SiemPageName } from '../../app/types';

import { TimelinesPage } from './timelines_page';
import { PAGE_TITLE } from './translations';
import { appendSearch } from '../../common/components/link_to/helpers';
const timelinesPagePath = `/:pageName(${SiemPageName.timelines})/:tabName(${TimelineType.default}|${TimelineType.template})`;
const timelinesDefaultPath = `/${SiemPageName.timelines}/${TimelineType.default}`;

const TabNameMappedToI18nKey: Record<string, string> = {
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
      href: `${getTimelinesUrl(appendSearch(search[1]))}`,
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
  return (
    <Switch>
      <Route exact path={timelinesPagePath}>
        <ApolloConsumer>{(client) => <TimelinesPage apolloClient={client} />}</ApolloConsumer>
      </Route>
      <Route
        path={`/${SiemPageName.timelines}/`}
        render={({ location: { search = '' } }) => (
          <Redirect to={`${timelinesDefaultPath}${appendSearch(search)}`} />
        )}
      />
    </Switch>
  );
});

Timelines.displayName = 'Timelines';
