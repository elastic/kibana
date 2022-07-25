/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
// @ts-ignore
import { Listing } from '../../../components/cluster/listing';
import { EnableAlertsModal } from '../../../alerts/enable_alerts_modal';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { ExternalConfigContext } from '../../contexts/external_config_context';
import { ComponentProps } from '../../route_init';
import { useTable } from '../../hooks/use_table';
import { PageTemplate, TabMenuItem } from '../page_template';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';
import { fetchClusters } from '../../../lib/fetch_clusters';

const pageTitle = i18n.translate('xpack.monitoring.cluster.listing.pageTitle', {
  defaultMessage: 'Cluster listing',
});

const tabTitle = i18n.translate('xpack.monitoring.cluster.listing.tabTitle', {
  defaultMessage: 'Clusters',
});

const getAlerts = (clusters: any[]) => {
  return clusters.reduce(
    (alerts, cluster) => ({ ...alerts, ...((cluster.alerts && cluster.alerts.list) || {}) }),
    {}
  );
};

export const ClusterListing: React.FC<ComponentProps> = () => {
  const globalState = useContext(GlobalStateContext);
  const externalConfig = useContext(ExternalConfigContext);
  const { services } = useKibana<{ data: any }>();
  const [clusters, setClusters] = useState([] as any);
  const { update: updateBreadcrumbs } = useContext(BreadcrumbContainer.Context);

  const fakeScope = {
    $evalAsync: (fn: () => void) => fn(),
    filterQuery: '', // replace with something
  };
  const { getPaginationTableProps } = useTable('clusters');
  const { sorting, pagination, onTableChange } = getPaginationTableProps();

  useEffect(() => {
    updateBreadcrumbs([
      {
        'data-test-subj': 'clusterListingBreadcrumb',
        text: tabTitle,
      },
    ]);
  }, [updateBreadcrumbs]);

  const tabs: TabMenuItem[] = [
    {
      id: 'clusters',
      label: tabTitle,
      testSubj: 'clusterListingTab',
      route: '/home',
    },
  ];

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    if (services.http?.fetch) {
      const response = await fetchClusters({
        fetch: services.http.fetch,
        timeRange: {
          min: bounds.min.toISOString(),
          max: bounds.max.toISOString(),
        },
        ccs: globalState.ccs,
        codePaths: ['all'],
      });
      setClusters(response);
    }
  }, [globalState.ccs, services.data?.query.timefilter.timefilter, services.http]);

  if (globalState.save && clusters.length === 1) {
    globalState.cluster_uuid = clusters[0].cluster_uuid;
    globalState.save();
  }

  return (
    <PageTemplate tabs={tabs} title={pageTitle} pageTitle={pageTitle} getPageData={getPageData}>
      {clusters.length === 1 && <Redirect to={{ pathname: '/overview' }} />}
      <Listing
        clusters={clusters}
        angular={{
          scope: fakeScope,
          globalState,
          storage: {
            get: (key: string) => window.localStorage.getItem(key),
            set: (key: string, value: string) => window.localStorage.setItem(key, value),
          },
          showLicenseExpiration: externalConfig.showLicenseExpiration,
        }}
        sorting={sorting}
        pagination={pagination}
        onTableChange={onTableChange}
      />
      <EnableAlertsModal alerts={getAlerts(clusters)} />
    </PageTemplate>
  );
};
