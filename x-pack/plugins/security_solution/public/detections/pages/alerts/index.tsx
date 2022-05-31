/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { ALERTS_PATH, SecurityPageName } from '../../../../common/constants';
import { NotFoundPage } from '../../../app/404';
import * as i18n from './translations';
import { DetectionEnginePage } from '../detection_engine/detection_engine';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useReadonlyHeader } from '../../../use_readonly_header';

const AlertsRoute = () => (
  <TrackApplicationView viewId={SecurityPageName.alerts}>
    <DetectionEnginePage />
    <SpyRoute pageName={SecurityPageName.alerts} />
  </TrackApplicationView>
);

const AlertsContainerComponent: React.FC = () => {
  useReadonlyHeader(i18n.READ_ONLY_BADGE_TOOLTIP);

  return (
    <Switch>
      <Route path={ALERTS_PATH} exact component={AlertsRoute} />
      <Route component={NotFoundPage} />
    </Switch>
  );
};

export const Alerts = React.memo(AlertsContainerComponent);
