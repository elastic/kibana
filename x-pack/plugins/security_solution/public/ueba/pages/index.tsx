/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import { isEmpty } from 'lodash/fp';
import { ChromeBreadcrumb } from 'kibana/public';
import { GetUrlForApp } from '../../common/components/navigation/types';
import { APP_ID, SecurityPageName, UEBA_PATH } from '../../../common/constants';
import { UebaTableType } from '../store/model';
import { Ueba } from './ueba';
import * as i18n from './translations';
import { UebaRouteSpyState } from '../../common/utils/route/types';

const getUebaTabPath = () => `${UEBA_PATH}/:tabName(${UebaTableType.riskScore})`;
export const getBreadcrumbs = (
  params: UebaRouteSpyState,
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] => [
  {
    text: i18n.PAGE_TITLE,
    href: getUrlForApp(APP_ID, {
      deepLinkId: SecurityPageName.ueba,
      path: !isEmpty(search[0]) ? search[0] : '',
    }),
  },
];

export const UebaContainer = React.memo(() => (
  <Switch>
    <Route
      exact
      strict
      path={UEBA_PATH}
      render={({ location: { search = '' } }) => (
        <Redirect to={{ pathname: `${UEBA_PATH}/${UebaTableType.riskScore}`, search }} />
      )}
    />

    <Route path={getUebaTabPath()}>
      <Ueba />
    </Route>
  </Switch>
));

UebaContainer.displayName = 'UebaContainer';
