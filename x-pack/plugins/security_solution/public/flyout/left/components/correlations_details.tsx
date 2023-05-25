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

export const CORRELATIONS_TAB_ID = 'correlations-details';

/**
 * Correlations displayed in the document details expandable flyout left section under the Insights tab
 */
export const CorrelationsDetails: React.FC = () => {
  const { indexName, eventId } = useLeftPanelContext();

  const scopeId = 'flyout'; // TODO: update to use context

  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;

  const sourcererDataView = useSourcererDataView(sourcererScope);

  const [isEventDataLoading, eventData, searchHit, dataAsNestedObject] = useTimelineEventsDetails({
    indexName,
    eventId,
    runtimeMappings: sourcererDataView.runtimeMappings,
    skip: !eventId,
  });

  const {
    loading: isCorrelationsLoading,
    error,
    data,
  } = useCorrelations({
    eventId,
    dataAsNestedObject,
    dataFormattedForFieldBrowser: eventData,
    scopeId,
  });

  console.log('correlationsData', data);
  console.log('eventData', eventData);

  // TODO: get actual alerts for each of the sections

  return <EuiText data-test-subj={CORRELATIONS_DETAILS_TEST_ID}>{'Correlations'}</EuiText>;
};

CorrelationsDetails.displayName = 'CorrelationsDetails';
