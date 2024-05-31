/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import { SpyRoute } from '../common/utils/route/spy_routes';
import { NotFoundPage } from '../app/404';

import {
  ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
  SecurityPageName,
} from '../../common/constants';
import { EntityAnalyticsManagementPage } from './pages/entity_analytics_management_page';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { AssetCriticalityUploadPage } from './pages/asset_criticality_upload_page';

const EntityAnalyticsManagementTelemetry = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.entityAnalyticsManagement}>
      <EntityAnalyticsManagementPage />
      <SpyRoute pageName={SecurityPageName.entityAnalyticsManagement} />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const EntityAnalyticsManagementContainer: React.FC = React.memo(() => {
  return (
    <Switch>
      <Route
        path={ENTITY_ANALYTICS_MANAGEMENT_PATH}
        exact
        component={EntityAnalyticsManagementTelemetry}
      />
      <Route component={NotFoundPage} />
    </Switch>
  );
});
EntityAnalyticsManagementContainer.displayName = 'EntityAnalyticsManagementContainer';

const EntityAnalyticsAssetClassificationTelemetry = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.entityAnalyticsAssetClassification}>
      <AssetCriticalityUploadPage />
      <SpyRoute pageName={SecurityPageName.entityAnalyticsAssetClassification} />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const EntityAnalyticsAssetClassificationContainer: React.FC = React.memo(() => {
  return (
    <Switch>
      <Route
        path={ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH}
        exact
        component={EntityAnalyticsAssetClassificationTelemetry}
      />
      <Route component={NotFoundPage} />
    </Switch>
  );
});

EntityAnalyticsAssetClassificationContainer.displayName =
  'EntityAnalyticsAssetClassificationContainer';

export const routes = [
  {
    path: ENTITY_ANALYTICS_MANAGEMENT_PATH,
    component: EntityAnalyticsManagementContainer,
  },
  {
    path: ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH,
    component: EntityAnalyticsAssetClassificationContainer,
  },
];
