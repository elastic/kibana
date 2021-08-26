/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';
import { useGetUserAlertsPermissions } from '@kbn/alerts';

import { ALERTS_PATH, SecurityPageName, SERVER_APP_ID } from '../../../../common/constants';
import { NotFoundPage } from '../../../app/404';
import * as i18n from './translations';
import { TrackApplicationView } from '../../../../../../../src/plugins/usage_collection/public';
import { DetectionEnginePage } from '../../pages/detection_engine/detection_engine';
import { useKibana } from '../../../common/lib/kibana';
import { SpyRoute } from '../../../common/utils/route/spy_routes';

const AlertsRoute = () => (
  <TrackApplicationView viewId={SecurityPageName.alerts}>
    <DetectionEnginePage />
    <SpyRoute pageName={SecurityPageName.alerts} />
  </TrackApplicationView>
);

const AlertsContainerComponent: React.FC = () => {
  const {
    chrome,
    application: { capabilities },
  } = useKibana().services;
  const userPermissions = useGetUserAlertsPermissions(capabilities, SERVER_APP_ID);

  useEffect(() => {
    // if the user is read only then display the glasses badge in the global navigation header
    if (userPermissions != null && !userPermissions.crud && userPermissions.read) {
      chrome.setBadge({
        text: i18n.READ_ONLY_BADGE_TEXT,
        tooltip: i18n.READ_ONLY_BADGE_TOOLTIP,
        iconType: 'glasses',
      });
    }

    // remove the icon after the component unmounts
    return () => {
      chrome.setBadge();
    };
  }, [userPermissions, chrome]);

  return (
    <Switch>
      <Route path={ALERTS_PATH} exact component={AlertsRoute} />
      <Route component={NotFoundPage} />
    </Switch>
  );
};

export const Alerts = React.memo(AlertsContainerComponent);
