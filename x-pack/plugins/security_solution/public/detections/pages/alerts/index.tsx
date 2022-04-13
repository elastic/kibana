/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { useExecutionContext } from 'src/plugins/kibana_react/public';
import { ALERTS_PATH, SecurityPageName } from '../../../../common/constants';
import { NotFoundPage } from '../../../app/404';
import * as i18n from './translations';
import { TrackApplicationView } from '../../../../../../../src/plugins/usage_collection/public';
import { DetectionEnginePage } from '../../pages/detection_engine/detection_engine';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useReadonlyHeader } from '../../../use_readonly_header';
import { useKibana } from '../../../common/lib/kibana';

const AlertsRoute = () => (
  <TrackApplicationView viewId={SecurityPageName.alerts}>
    <DetectionEnginePage />
    <SpyRoute pageName={SecurityPageName.alerts} />
  </TrackApplicationView>
);

const AlertsContainerComponent: React.FC = () => {
  const { executionContext } = useKibana().services;
  useReadonlyHeader(i18n.READ_ONLY_BADGE_TOOLTIP);

  // Application ID and current URL are traced automatically.
  useExecutionContext(executionContext, {
    page: SecurityPageName.alerts,
    type: 'application'
  });

  return (
    <Switch>
      <Route path={ALERTS_PATH} exact component={AlertsRoute} />
      <Route component={NotFoundPage} />
    </Switch>
  );
};

export const Alerts = React.memo(AlertsContainerComponent);
