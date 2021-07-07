/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import { UEBA_PATH } from '../../../common/constants';
import { UebaTableType } from '../store/model';
import { Ueba } from './ueba';
import { uebaDetailsPagePath } from './types';
import { UebaDetails } from './details';

const uebaTabPath = `${UEBA_PATH}/:tabName(${UebaTableType.riskScore})`;

const uebaDetailsTabPath =
  `${uebaDetailsPagePath}/:tabName(` +
  `${UebaTableType.hostRules}|` +
  `${UebaTableType.hostTactics}|` +
  `${UebaTableType.userRules})`;

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

    <Route path={uebaTabPath}>
      <Ueba />
    </Route>
    <Route
      path={uebaDetailsTabPath}
      render={({
        match: {
          params: { detailName },
        },
      }) => <UebaDetails uebaDetailsPagePath={uebaDetailsPagePath} detailName={detailName} />}
    />
    <Route
      path={uebaDetailsPagePath}
      render={({
        match: {
          params: { detailName },
        },
        location: { search = '' },
      }) => (
        <Redirect
          to={{
            pathname: `${UEBA_PATH}/${detailName}/${UebaTableType.hostRules}`,
            search,
          }}
        />
      )}
    />
  </Switch>
));

UebaContainer.displayName = 'UebaContainer';
