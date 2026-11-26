/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../../../context/apm_service/use_apm_service_context';
import { TimeRangeMetadataContextProvider } from '../../../../../context/time_range_metadata/time_range_metadata_context';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { getKueryWithMobileFilters } from '../../../../../../common/utils/get_kuery_with_mobile_filters';
import { ContextualServiceMapSection } from '../../../service_map/contextual_map/contextual_service_map_section';
import { SERVICE_OVERVIEW_CONTEXTUAL_MAP_PANEL_HEIGHT } from '../../../service_map/contextual_map/constants';

export function MobileServiceOverviewServiceMapSection() {
  const { core } = useApmPluginContext();
  const { serviceName, transactionType } = useApmServiceContext();
  const {
    query: {
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      device,
      osVersion,
      appVersion,
      netConnectionType,
      latencyAggregationType,
    },
  } = useApmParams('/mobile-services/{serviceName}/overview');

  const kueryWithMobileFilters = getKueryWithMobileFilters({
    device,
    osVersion,
    appVersion,
    netConnectionType,
    kuery,
  });

  // Resolved the way `ServiceMapEmbeddable` resolves it, so the provider below uses the map's range
  const { start, end } = useTimeRange({ rangeFrom, rangeTo, optional: true });

  // Chart filters only. The flyout copies the embeddable's resolved start/end
  // when it opens and keeps that window across Refresh.
  const flyoutOptions = useMemo(
    () => ({
      transactionType,
      latencyAggregationType,
    }),
    [transactionType, latencyAggregationType]
  );

  if (!serviceName || !rangeFrom || !rangeTo) {
    return null;
  }

  // `useServiceMap` reads its data source from the nearest provider. The route's provider only
  // sees the URL kuery, not the mobile filters this map queries with.
  return (
    <TimeRangeMetadataContextProvider
      uiSettings={core.uiSettings}
      start={start ?? rangeFrom}
      end={end ?? rangeTo}
      kuery={kueryWithMobileFilters}
      useSpanName={false}
    >
      <ContextualServiceMapSection
        serviceName={serviceName}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        environment={environment}
        kuery={kueryWithMobileFilters}
        flyoutOptions={flyoutOptions}
        panelHeight={SERVICE_OVERVIEW_CONTEXTUAL_MAP_PANEL_HEIGHT}
        embeddableMinHeight={0}
        sectionTestSubj="apmMobileServiceOverviewServiceMapSection"
        exploreLinkTestSubj="apmMobileServiceOverviewExploreInServiceMap"
        embeddableContainerTestSubj="apmMobileServiceOverviewServiceMapEmbeddableContainer"
      />
    </TimeRangeMetadataContextProvider>
  );
}
