/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Switch, useParams } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { getAlertDetailsTabUrl } from '../../../common/components/link_to';
import { AlertDetailRouteType } from './types';
import { SecuritySolutionTabNavigation } from '../../../common/components/navigation';
import { getAlertDetailsNavTabs } from './utils/navigation';
import { DEFAULT_ALERTS_INDEX, SecurityPageName } from '../../../../common/constants';
import { eventID } from '../../../../common/endpoint/models/event';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { AlertDetailsLoadingPage } from './components/loading-page';
import { AlertDetailsErrorPage } from './components/error-page';

export const AlertDetailsPage = memo(() => {
  const { detailName: eventId } = useParams<{ detailName: string }>();
  const currentSpaceId = useSpaceId();
  const { runtimeMappings } = useSourcererDataView(SourcererScopeName.detections);
  const [loading, detailsData, rawEventData, ecsData, refetchFlyoutData] = useTimelineEventsDetails(
    {
      indexName: `${DEFAULT_ALERTS_INDEX}-${currentSpaceId}`,
      eventId,
      runtimeMappings,
      skip: !eventID,
    }
  );
  const dataNotFound = !loading && !detailsData;
  const hasData = !loading && detailsData;
  const ruleName = ecsData?.kibana?.alert?.rule?.name ? ecsData?.kibana?.alert?.rule?.name[0] : '';
  return (
    <>
      {loading && <AlertDetailsLoadingPage eventId={eventId} />}
      {dataNotFound && <AlertDetailsErrorPage eventId={eventId} />}
      {hasData && (
        <>
          <SecuritySolutionTabNavigation navTabs={getAlertDetailsNavTabs(eventId)} />
          <Switch>
            <Route exact path={getAlertDetailsTabUrl(eventId, AlertDetailRouteType.summary)}>
              <h1>{'Summary Page'}</h1>
            </Route>
          </Switch>
        </>
      )}
      <SpyRoute pageName={SecurityPageName.alerts} state={{ ruleName }} />
    </>
  );
});
