/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import React from 'react';
import { Switch, Route, useHistory } from 'react-router-dom';

import { ChromeBreadcrumb } from '../../../../../../src/core/public';

import { TimelineType } from '../../../common/types/timeline';
import { TAB_TIMELINES, TAB_TEMPLATES } from '../components/open_timeline/translations';
import { TimelineRouteSpyState } from '../../common/utils/route/types';

import { TimelinesPage } from './timelines_page';
import { PAGE_TITLE } from './translations';
import { appendSearch } from '../../common/components/link_to/helpers';
import { GetUrlForApp } from '../../common/components/navigation/types';
import { APP_ID } from '../../../common/constants';
import { SecurityPageName } from '../../app/types';

const timelinesPagePath = `/:tabName(${TimelineType.default}|${TimelineType.template})`;
const timelinesDefaultPath = `/${TimelineType.default}`;

const TabNameMappedToI18nKey: Record<string, string> = {
  [TimelineType.default]: TAB_TIMELINES,
  [TimelineType.template]: TAB_TEMPLATES,
};

export const getBreadcrumbs = (
  params: TimelineRouteSpyState,
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] => {
  let breadcrumb = [
    {
      text: PAGE_TITLE,
      href: getUrlForApp(`${APP_ID}:${SecurityPageName.timelines}`, {
        path: !isEmpty(search[0]) ? search[0] : '',
      }),
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
    <Switch>
      <Route exact path={timelinesPagePath}>
        <TimelinesPage />
      </Route>
      <Route
        path="/"
        render={({ location: { search = '' } }) => {
          history.replace(`${timelinesDefaultPath}${appendSearch(search)}`);
          return null;
        }}
      />
    </Switch>
  );
});

Timelines.displayName = 'Timelines';
