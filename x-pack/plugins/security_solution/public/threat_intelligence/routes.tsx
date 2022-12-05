/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import type { SecuritySolutionPluginContext } from '@kbn/threat-intelligence-plugin/public';
import { THREAT_INTELLIGENCE_BASE_PATH } from '@kbn/threat-intelligence-plugin/public';
import type { SourcererDataView } from '@kbn/threat-intelligence-plugin/public/types';
import type { Store } from 'redux';
import { useSelector } from 'react-redux';
import { useInvestigateInTimeline } from './use_investigate_in_timeline';
import { getStore, inputsSelectors } from '../common/store';
import { useKibana } from '../common/lib/kibana';
import { FiltersGlobal } from '../common/components/filters_global';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { licenseService } from '../common/hooks/use_license';
import { SecurityPageName } from '../app/types';
import type { SecuritySubPluginRoutes } from '../app/types';
import { useSourcererDataView } from '../common/containers/sourcerer';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { SiemSearchBar } from '../common/components/search_bar';
import { useGlobalTime } from '../common/containers/use_global_time';
import { deleteOneQuery, setQuery } from '../common/store/inputs/actions';
import { InputsModelId } from '../common/store/inputs/constants';

const ThreatIntelligence = memo(() => {
  const { threatIntelligence } = useKibana().services;
  const ThreatIntelligencePlugin = threatIntelligence.getComponent();

  const sourcererDataView = useSourcererDataView();

  const securitySolutionStore = getStore() as Store;

  const securitySolutionContext: SecuritySolutionPluginContext = {
    securitySolutionStore,

    getFiltersGlobalComponent: () => FiltersGlobal,
    getPageWrapper: () => SecuritySolutionPageWrapper,
    licenseService,
    sourcererDataView: sourcererDataView as unknown as SourcererDataView,
    getUseInvestigateInTimeline: useInvestigateInTimeline,

    useQuery: () => useSelector(inputsSelectors.globalQuerySelector()),
    useFilters: () => useSelector(inputsSelectors.globalFiltersQuerySelector()),
    useGlobalTime,

    registerQuery: (query) =>
      securitySolutionStore.dispatch(
        setQuery({
          inputId: InputsModelId.global,
          id: query.id,
          refetch: query.refetch,
          inspect: null,
          loading: query.loading,
        })
      ),
    deregisterQuery: (query) =>
      securitySolutionStore.dispatch(
        deleteOneQuery({
          inputId: InputsModelId.global,
          id: query.id,
        })
      ),

    SiemSearchBar,
  };

  return (
    <TrackApplicationView viewId="threat_intelligence">
      <ThreatIntelligencePlugin securitySolutionContext={securitySolutionContext} />
      <SpyRoute pageName={SecurityPageName.threatIntelligenceIndicators} />
    </TrackApplicationView>
  );
});

ThreatIntelligence.displayName = 'ThreatIntelligence';

export const routes: SecuritySubPluginRoutes = [
  {
    path: THREAT_INTELLIGENCE_BASE_PATH,
    render: () => <ThreatIntelligence />,
  },
];
