/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, Switch } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { ALERTS_PATH, SecurityPageName } from '../../../../common/constants';
import { NotFoundPage } from '../../../app/404';
import * as i18n from './translations';
import { DetectionEnginePage } from '../detection_engine/detection_engine';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useReadonlyHeader } from '../../../use_readonly_header';
import { AlertDetailsPage } from '../alert_details';
import { AlertDetailRouteType } from '../alert_details/types';
import { getAlertDetailsTabUrl } from '../alert_details/utils/navigation';

const AlertsRoute = () => (
  <TrackApplicationView viewId={SecurityPageName.alerts}>
    <DetectionEnginePage />
    <SpyRoute pageName={SecurityPageName.alerts} />
  </TrackApplicationView>
);

const AlertDetailsRoute = () => (
  <TrackApplicationView viewId={SecurityPageName.alerts}>
    <AlertDetailsPage />
  </TrackApplicationView>
);

const AlertsContainerComponent: React.FC = () => {
  useReadonlyHeader(i18n.READ_ONLY_BADGE_TOOLTIP);
  const isAlertDetailsPageEnabled = useIsExperimentalFeatureEnabled('alertDetailsPageEnabled');
  return (
    <Switch>
      <Route path={ALERTS_PATH} exact component={AlertsRoute} />
      {isAlertDetailsPageEnabled && (
        <>
          {/* Redirect to the summary page if only the detail name is provided  */}
          <Route
            path={`${ALERTS_PATH}/:detailName`}
            render={({
              match: {
                params: { detailName },
              },
              location: { search = '' },
            }) => (
              <Redirect
                to={{
                  pathname: getAlertDetailsTabUrl(detailName, AlertDetailRouteType.summary),
                  search,
                }}
              />
            )}
          />
          <Route path={`${ALERTS_PATH}/:detailName/:tabName`} component={AlertDetailsRoute} />
        </>
      )}
      <Route component={NotFoundPage} />
    </Switch>
  );
};

export const Alerts = React.memo(AlertsContainerComponent);
