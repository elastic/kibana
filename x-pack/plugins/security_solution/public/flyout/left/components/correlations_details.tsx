/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { CORRELATIONS_DETAILS_TEST_ID } from './test_ids';

import { useCorrelations } from '../../right/hooks/use_correlations';
import { useLeftPanelContext } from '../context';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';
import { SecurityPageName } from '../../../../common';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useAlertsByIds } from '../../../common/containers/alerts/use_alerts_by_ids';

export const CORRELATIONS_TAB_ID = 'correlations-details';

/**
 * Correlations displayed in the document details expandable flyout left section under the Insights tab
 */
export const CorrelationsDetails: React.FC = () => {
  const { indexName, eventId } = useLeftPanelContext();

  const scopeId = 'flyout'; // TODO: update to use context

  // TODO: move this to a separate hook
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;

  const sourcererDataView = useSourcererDataView(sourcererScope);

  const [isEventDataLoading, eventData, _searchHit, dataAsNestedObject] = useTimelineEventsDetails({
    indexName,
    eventId,
    runtimeMappings: sourcererDataView.runtimeMappings,
    skip: !eventId,
  });

  const {
    loading: isCorrelationsLoading,
    error: correlationsError,
    data: correlationsData,
    ancestryAlertsIds,
    alertsBySessionIds,
    sameSourceAlertsIds,
  } = useCorrelations({
    eventId,
    dataAsNestedObject,
    dataFormattedForFieldBrowser: eventData,
    scopeId,
  });

  console.log('correlationsData', { ancestryAlertsIds, alertsBySessionIds, sameSourceAlertsIds });

  const {
    data: ancestryAlerts,
    loading: isAncestryAlertsLoading,
    error: ancestryAlertsError,
  } = useAlertsByIds({ alertIds: ancestryAlertsIds });

  const {
    data: sessionAlerts,
    loading: isSessionAlertsLoading,
    error: sessionAlertsError,
  } = useAlertsByIds({ alertIds: alertsBySessionIds });

  const {
    data: sameSourceAlerts,
    loading: isSameSourceAlertsLoading,
    error: sameSourceAlertsError,
  } = useAlertsByIds({ alertIds: sameSourceAlertsIds });

  return <EuiText data-test-subj={CORRELATIONS_DETAILS_TEST_ID}>{'Correlations'}</EuiText>;
};

CorrelationsDetails.displayName = 'CorrelationsDetails';
