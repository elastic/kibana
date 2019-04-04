/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { Listing } from './components/cluster/listing';
import { Overview } from './components/cluster/overview';
import { fetchClusters, setActiveClusterUuid, fetchCluster, setBreadcrumbs as actionSetBreadcrumbs } from './store/actions';
import { getStore } from './store';
import { getActiveClusterUuid } from './store/selectors';
import { getLicenseInstance } from './lib/license';

const breadcrumbClusters = 'Clusters';

function getCluster({ clusters }) {
  let cluster = null;
  const state = getStore().getState();
  if (clusters && clusters.length) {
    const activeClusterUuid = getActiveClusterUuid(state);
    if (activeClusterUuid) {
      cluster = clusters.find(cluster => cluster.cluster_uuid === activeClusterUuid);
    }
    if (!cluster && clusters[0].license) {
      cluster = clusters[0];
    }
  }

  return cluster;
}

function setLicense(cluster) {
  if (cluster) {
    getLicenseInstance().setLicense(cluster.license);
  }
}

function getLicenseRedirect(cluster) {
  const license = getLicenseInstance();

  // check if we need to redirect because of license problems
  if (license.isExpired()) {
    return <Redirect to="/license"/>;
  }

  // check if we need to redirect because of attempt at unsupported multi-cluster monitoring
  if (!cluster.isSupported) {
    return <Redirect to="/home"/>;
  }

  return null;
}

function setActiveCluster(cluster) {
  const store = getStore();
  const state = store.getState();
  if (cluster && cluster.cluster_uuid !== getActiveClusterUuid(state)) {
    store.dispatch(setActiveClusterUuid(cluster.cluster_uuid));
  }
}

function setBreadcrumbs(breadcrumbs) {
  getStore().dispatch(actionSetBreadcrumbs(breadcrumbs));
}

export const routeList = [
  (() => {
    const fetchData = (...args) => fetchClusters(...args);
    const breadcrumbs = [
      { href: '/home', text: breadcrumbClusters }
    ];

    return {
      path: '/home',
      render: (props) => {
        console.log('rendering /home');
        if (props.clusters.length === 1) {
          console.log('going to overview');
          return <Redirect to="/overview" />;
        }

        const cluster = getCluster(props);
        setLicense(cluster);
        setBreadcrumbs(breadcrumbs);

        return (
          <Listing
            fetchData={(...args) => getStore().dispatch(fetchData(...args))}
            {...props}
          />
        );
      },
      fetchData,
      breadcrumbs,
    };
  })(),
  (() => {
    const fetchData = (...args) => fetchCluster(...args);
    const breadcrumbs = [
      { href: '/home', text: breadcrumbClusters },
    ];

    return {
      path: '/overview',
      render: (props) => {
        console.log('rendering /overview');
        const cluster = getCluster(props);
        setLicense(cluster);
        setActiveCluster(cluster);
        setBreadcrumbs([
          ...breadcrumbs,
          { text: cluster.cluster_uuid }
        ]);

        const licenseRedirect = getLicenseRedirect(cluster);
        if (licenseRedirect) {
          return licenseRedirect;
        }

        return (
          <Overview
            fetchData={(...args) => getStore().dispatch(fetchData(...args))}
            cluster={cluster}
            {...props}
          />
        );
      },
      fetchData,
      breadcrumbs,
    };
  })()
];

export const findRouteFromLocation = location => {
  const pathname = (/#([^?]+)/.exec(location.hash) || []).pop();
  return routeList.find(route => route.path === pathname);
};

export const getRoutes = (routeOptions) => {
  return (
    <Switch>
      <Redirect exact from="/" to="/home" />
      {routeList.map(route => (
        <Route
          key={route.path}
          exact
          path={route.path}
          render={props => route.render({ ...props, ...routeOptions })}
        />
      ))}
    </Switch>
  );
};
