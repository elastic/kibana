/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext } from 'react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { useClusters } from './hooks/use_clusters';
import { GlobalStateContext } from './contexts/global_state_context';
import { getClusterFromClusters } from '../lib/get_cluster_from_clusters';
import { isInSetupMode } from '../lib/setup_mode';
import { LoadingPage } from './pages/loading_page';

export interface ComponentProps {
  clusters: [];
}
interface RouteInitProps {
  path: string;
  component: React.ComponentType<ComponentProps>;
  codePaths: string[];
  fetchAllClusters: boolean;
  unsetGlobalState?: boolean;
}

export const RouteInit: React.FC<RouteInitProps> = ({
  path,
  component,
  codePaths,
  fetchAllClusters,
  unsetGlobalState = false,
}) => {
  const globalState = useContext(GlobalStateContext);
  const clusterUuid = fetchAllClusters ? null : globalState.cluster_uuid;
  const location = useLocation();

  const { clusters, loaded } = useClusters(clusterUuid, undefined, codePaths);

  const inSetupMode = isInSetupMode(undefined, globalState);

  const cluster = getClusterFromClusters(clusters, globalState, unsetGlobalState);

  // TODO: check for setupMode too when the setup mode is migrated
  if (loaded && !cluster && !inSetupMode) {
    return <Redirect to="/no-data" />;
  }

  if (loaded && cluster) {
    // check if we need to redirect because of license problems
    if (
      location.pathname !== 'license' &&
      location.pathname !== 'home' &&
      isExpired(cluster.license)
    ) {
      return <Redirect to="/license" />;
    }

    // check if we need to redirect because of attempt at unsupported multi-cluster monitoring
    const clusterSupported = cluster.isSupported || clusters.length === 1;
    if (location.pathname !== '/home' && !clusterSupported) {
      return <Redirect to="/home" />;
    }
  }

  const Component = component;
  return loaded ? (
    <Route path={path}>
      <Component clusters={clusters} />
    </Route>
  ) : (
    <LoadingPage staticLoadingState />
  );
};

const isExpired = (license: any): boolean => {
  const { expiry_date_in_millis: expiryDateInMillis } = license;

  if (expiryDateInMillis !== undefined) {
    return new Date().getTime() >= expiryDateInMillis;
  }
  return false;
};
