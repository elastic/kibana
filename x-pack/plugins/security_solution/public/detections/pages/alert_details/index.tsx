/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { Switch, useParams } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';
import { ALERT_RULE_NAME, TIMESTAMP } from '@kbn/rule-data-utils';
import { EuiSpacer } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { timelineActions } from '../../../timelines/store/timeline';
import { TimelineId } from '../../../../common/types';
import { useGetFieldsData } from '../../../common/hooks/use_get_fields_data';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { getAlertDetailsTabUrl } from '../../../common/components/link_to';
import { AlertDetailRouteType } from './types';
import { TabNavigationWithBreadcrumbs } from '../../../common/components/navigation/tab_navigation_with_breadcrumbs';
import { getAlertDetailsNavTabs } from './utils/navigation';
import { SecurityPageName } from '../../../../common/constants';
import { eventID } from '../../../../common/endpoint/models/event';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { AlertDetailsLoadingPage } from './components/loading_page';
import { AlertDetailsErrorPage } from './components/error_page';
import { AlertDetailsHeader } from './components/header';
import { DetailsSummaryTab } from './tabs/summary';

export const AlertDetailsPage = memo(() => {
  const { detailName: eventId } = useParams<{ detailName: string }>();
  const dispatch = useDispatch();
  const sourcererDataView = useSourcererDataView(SourcererScopeName.detections);
  const indexName = useMemo(
    () => sourcererDataView.selectedPatterns.join(','),
    [sourcererDataView.selectedPatterns]
  );

  const [loading, detailsData, searchHit, dataAsNestedObject] = useTimelineEventsDetails({
    indexName,
    eventId,
    runtimeMappings: sourcererDataView.runtimeMappings,
    skip: !eventID,
  });
  const dataNotFound = !loading && !detailsData;
  const hasData = !loading && detailsData;

  // Example of using useGetFieldsData. Only place it is used currently
  const getFieldsData = useGetFieldsData(searchHit?.fields);
  const timestamp = getFieldsData(TIMESTAMP) as string | undefined;
  const ruleName = getFieldsData(ALERT_RULE_NAME) as string | undefined;

  useEffect(() => {
    // TODO: move detail panel to it's own redux state
    dispatch(
      timelineActions.createTimeline({
        id: TimelineId.detectionsAlertDetailsPage,
        columns: [],
        dataViewId: null,
        indexNames: [],
        expandedDetail: {},
        show: false,
      })
    );
  }, [dispatch]);

  return (
    <>
      {loading && <AlertDetailsLoadingPage eventId={eventId} />}
      {dataNotFound && <AlertDetailsErrorPage eventId={eventId} />}
      {hasData && (
        <>
          <AlertDetailsHeader loading={loading} ruleName={ruleName} timestamp={timestamp} />
          <TabNavigationWithBreadcrumbs navTabs={getAlertDetailsNavTabs(eventId)} />
          <EuiSpacer size="l" />
          <Switch>
            <Route exact path={getAlertDetailsTabUrl(eventId, AlertDetailRouteType.summary)}>
              <DetailsSummaryTab
                eventId={eventId}
                dataAsNestedObject={dataAsNestedObject}
                searchHit={searchHit}
                detailsData={detailsData}
                sourcererDataView={sourcererDataView}
              />
            </Route>
          </Switch>
        </>
      )}
      <SpyRoute pageName={SecurityPageName.alerts} state={{ ruleName }} />
    </>
  );
});
