/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';

import { ChromeBreadcrumb } from '@kbn/core/public';

import { TimelineType } from '../../../common/types/timeline';
import { TimelineRouteSpyState } from '../../common/utils/route/types';

import { TimelinesPage } from './timelines_page';
import { PAGE_TITLE } from './translations';
import { appendSearch } from '../../common/components/link_to/helpers';
import { GetUrlForApp } from '../../common/components/navigation/types';
import { APP_UI_ID, TIMELINES_PATH } from '../../../common/constants';
import { SecurityPageName } from '../../app/types';

const timelinesPagePath = `${TIMELINES_PATH}/:tabName(${TimelineType.default}|${TimelineType.template})`;
const timelinesDefaultPath = `${TIMELINES_PATH}/${TimelineType.default}`;

export const getBreadcrumbs = (
  params: TimelineRouteSpyState,
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] => [
  {
    text: PAGE_TITLE,
    href: getUrlForApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.timelines,
      path: !isEmpty(search[0]) ? search[0] : '',
    }),
  },
];

export const Timelines = React.memo(() => (
  <Switch>
    <Route exact path={timelinesPagePath}>
      <TimelinesPage />
    </Route>
    <Route
      path={TIMELINES_PATH}
      render={({ location: { search = '' } }) => (
        <Redirect to={`${timelinesDefaultPath}${appendSearch(search)}`} />
      )}
    />
  </Switch>
));

Timelines.displayName = 'Timelines';
