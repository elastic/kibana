/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import deepEqual from 'fast-deep-equal';

import { useKibana } from '../../lib/kibana';
import { RouteSpyState } from '../../utils/route/types';
import { makeMapStateToProps } from '../url_state/helpers';
import { setBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';
import { SiemNavigationProps } from './types';
import { useDeepEqualSelector } from '../../hooks/use_selector';

const mapStateToProps = makeMapStateToProps();

const SiemNavigationComponent: React.FC<SiemNavigationProps> = ({ display, navTabs }) => {
  const {
    chrome,
    application: { getUrlForApp },
  } = useKibana().services;
  const { pathname: pathName, search, state } = useLocation();
  const { flowTarget, tabName, detailName } = useParams<RouteSpyState>();
  const { urlState } = useDeepEqualSelector(mapStateToProps);

  useEffect(() => {
    if (pathName || state?.pageName) {
      setBreadcrumbs(
        {
          detailName,
          filters: urlState.filters,
          flowTarget,
          navTabs,
          pageName: state?.pageName,
          pathName,
          query: urlState.query,
          savedQuery: urlState.savedQuery,
          search,
          sourcerer: urlState.sourcerer,
          state,
          tabName,
          timeline: urlState.timeline,
          timerange: urlState.timerange,
        },
        chrome,
        getUrlForApp
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chrome, pathName, search, navTabs, urlState, state]);

  return (
    <TabNavigation
      query={urlState.query}
      display={display}
      filters={urlState.filters}
      navTabs={navTabs}
      pageName={state?.pageName}
      pathName={pathName}
      sourcerer={urlState.sourcerer}
      savedQuery={urlState.savedQuery}
      tabName={tabName}
      timeline={urlState.timeline}
      timerange={urlState.timerange}
    />
  );
};

export const SiemNavigation = React.memo(
  SiemNavigationComponent,
  (prevProps, nextProps) =>
    prevProps.display === nextProps.display && deepEqual(prevProps.navTabs, nextProps.navTabs)
);
