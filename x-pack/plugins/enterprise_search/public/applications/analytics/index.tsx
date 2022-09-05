/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { isVersionMismatch } from '../../../common/is_version_mismatch';
import { InitialAppData } from '../../../common/types';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { AddAnalyticsCollection } from './components/add_analytics_collections/add_analytics_collection';

import { AnalyticsCollectionView } from './components/analytics_collection_view/analytics_collection_view';
import { AnalyticsOverview } from './components/analytics_overview/analytics_overview';

import { ROOT_PATH, COLLECTION_CREATION_PATH, COLLECTION_VIEW_PATH } from './routes';

export const Analytics: React.FC<InitialAppData> = (props) => {
  const { enterpriseSearchVersion, kibanaVersion } = props;
  const incompatibleVersions = isVersionMismatch(enterpriseSearchVersion, kibanaVersion);

  return (
    <Switch>
      <Route exact path={ROOT_PATH}>
        {incompatibleVersions ? (
          <VersionMismatchPage
            enterpriseSearchVersion={enterpriseSearchVersion}
            kibanaVersion={kibanaVersion}
          />
        ) : (
          <AnalyticsOverview />
        )}
      </Route>
      <Route path={COLLECTION_CREATION_PATH}>
        <AddAnalyticsCollection />
      </Route>
      <Route exact path={COLLECTION_VIEW_PATH}>
        <AnalyticsCollectionView />
      </Route>
    </Switch>
  );
};
