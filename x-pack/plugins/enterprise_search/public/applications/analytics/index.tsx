/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { useValues } from 'kea';

import { isVersionMismatch } from '../../../common/is_version_mismatch';
import { InitialAppData } from '../../../common/types';
import { enableBehavioralAnalyticsSection } from '../../../common/ui_settings_keys';
import { KibanaLogic } from '../shared/kibana';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { AddAnalyticsCollection } from './components/add_analytics_collections/add_analytics_collection';

import { AnalyticsCollectionView } from './components/analytics_collection_view/analytics_collection_view';
import { AnalyticsFeatureDisabledError } from './components/analytics_feature_disabled_error/analytics_feature_disabled_error';
import { AnalyticsOverview } from './components/analytics_overview/analytics_overview';

import { ROOT_PATH, COLLECTION_CREATION_PATH, COLLECTION_VIEW_PATH } from './routes';

export const Analytics: React.FC<InitialAppData> = (props) => {
  const { enterpriseSearchVersion, kibanaVersion } = props;
  const incompatibleVersions = isVersionMismatch(enterpriseSearchVersion, kibanaVersion);
  const { uiSettings } = useValues(KibanaLogic);

  const analyticsSectionEnabled = uiSettings?.get<boolean>(enableBehavioralAnalyticsSection, false);

  if (!analyticsSectionEnabled) {
    return <AnalyticsFeatureDisabledError />;
  }

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
