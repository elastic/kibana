/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useKibana } from '../../common/lib/kibana';
import { SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { showGlobalFilters } from '../../timelines/components/timeline/helpers';
import { useGlobalFullScreen } from '../../common/containers/use_full_screen';
import { useSourcererDataView } from '../../common/containers/sourcerer';

export const KubernetesContainer = React.memo(() => {
  const { kubernetesSecurity } = useKibana().services;
  const { globalFullScreen } = useGlobalFullScreen();
  const {
    indexPattern,
    // runtimeMappings,
    // loading: isLoadingIndexPattern,
  } = useSourcererDataView();
  return (
    <SecuritySolutionPageWrapper noPadding>
      {kubernetesSecurity.getKubernetesPage({
        filter: (
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId: undefined })}>
            <SiemSearchBar id="global" indexPattern={indexPattern} />
          </FiltersGlobal>
        ),
      })}
      <SpyRoute pageName={SecurityPageName.kubernetes} />
    </SecuritySolutionPageWrapper>
  );
});

KubernetesContainer.displayName = 'KubernetesContainer';
