/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { ContextualServiceMapSection } from '../../service_map/contextual_map/contextual_service_map_section';
import { SERVICE_OVERVIEW_CONTEXTUAL_MAP_PANEL_HEIGHT } from '../../service_map/contextual_map/constants';

export function ServiceOverviewServiceMapSection() {
  const { serviceName, transactionType } = useApmServiceContext();
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/overview');

  // Hand the page's transaction type to the flyout so both show the same charts from the start,
  // instead of the flyout resolving its own default for the service.
  const flyoutOptions = useMemo(() => ({ transactionType }), [transactionType]);

  if (!serviceName || !rangeFrom || !rangeTo) {
    return null;
  }

  return (
    <ContextualServiceMapSection
      serviceName={serviceName}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      environment={environment}
      kuery={kuery}
      flyoutOptions={flyoutOptions}
      panelHeight={SERVICE_OVERVIEW_CONTEXTUAL_MAP_PANEL_HEIGHT}
      embeddableMinHeight={0}
      sectionTestSubj="apmServiceOverviewServiceMapSection"
      exploreLinkTestSubj="apmServiceOverviewExploreInServiceMap"
      embeddableContainerTestSubj="apmServiceOverviewServiceMapEmbeddableContainer"
    />
  );
}
