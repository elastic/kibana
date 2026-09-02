/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useApmServiceContext } from '../../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { getKueryWithMobileFilters } from '../../../../../../common/utils/get_kuery_with_mobile_filters';
import { ContextualServiceMapSection } from '../../../service_map/contextual_map/contextual_service_map_section';
import { SERVICE_OVERVIEW_CONTEXTUAL_MAP_PANEL_HEIGHT } from '../../../service_map/contextual_map/constants';

export function MobileServiceOverviewServiceMapSection() {
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
      comparisonEnabled,
      offset,
    },
  } = useApmParams('/mobile-services/{serviceName}/overview');

  const kueryWithMobileFilters = getKueryWithMobileFilters({
    device,
    osVersion,
    appVersion,
    netConnectionType,
    kuery,
  });

  // Seed the service flyout with the page's filters so its charts match the
  // mobile service overview charts.
  const flyoutOptions = useMemo(
    () => ({
      transactionType,
      comparisonEnabled,
      offset,
    }),
    [transactionType, comparisonEnabled, offset]
  );

  if (!serviceName || !rangeFrom || !rangeTo) {
    return null;
  }

  return (
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
  );
}
