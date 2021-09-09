/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext } from 'react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { useClusters } from './hooks/use_clusters';
import { GlobalStateContext } from './global_state_context';
import { getClusterFromClusters } from '../lib/get_cluster_from_clusters';

interface RouteInitProps {
  path: string;
  component: React.ComponentType;
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

  // TODO: we will need this when setup mode is migrated
  // const inSetupMode = isInSetupMode();

  const cluster = getClusterFromClusters(clusters, globalState, unsetGlobalState);

  // TODO: check for setupMode too when the setup mode is migrated
  if (loaded && !cluster) {
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
    if (location.pathname !== 'home' && !clusterSupported) {
      return <Redirect to="/home" />;
    }
  }

  return loaded ? <Route path={path} component={component} /> : null;
};

const isExpired = (license: any): boolean => {
  const { expiry_date_in_millis: expiryDateInMillis } = license;

  if (expiryDateInMillis !== undefined) {
    return new Date().getTime() >= expiryDateInMillis;
  }
  return false;
};
