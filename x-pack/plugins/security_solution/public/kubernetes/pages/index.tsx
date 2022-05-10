/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-literals */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { KUBERNETES_PATH, SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { showGlobalFilters } from '../../timelines/components/timeline/helpers';
import { useGlobalFullScreen } from '../../common/containers/use_full_screen';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { SourcererScopeName } from '../../common/store/sourcerer/model';

export const KubernetesContainer = React.memo(() => {
  const { globalFullScreen } = useGlobalFullScreen();
  const {
    indexPattern,
    // runtimeMappings,
    // loading: isLoadingIndexPattern,
  } = useSourcererDataView(SourcererScopeName.detections);

  return (
    <SecuritySolutionPageWrapper noPadding>
      <Switch>
        <Route strict exact path={KUBERNETES_PATH}>
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId: undefined })}>
            <SiemSearchBar id="global" indexPattern={indexPattern} />
          </FiltersGlobal>
          <div>
            <span>this is where the place is</span>
          </div>
        </Route>
      </Switch>
      <SpyRoute pageName={SecurityPageName.kubernetes} />
    </SecuritySolutionPageWrapper>
  );
});

KubernetesContainer.displayName = 'KubernetesContainer';
