/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import { PageTemplate } from './page_template';
import { License } from '../../components';
import { GlobalStateContext } from '../contexts/global_state_context';
import { CODE_PATH_LICENSE, STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { MonitoringTimeContainer } from '../hooks/use_monitoring_time';

const CODE_PATHS = [CODE_PATH_LICENSE];

export const LicensePage: React.FC<{}> = () => {
  const title = i18n.translate('xpack.monitoring.license.licenseRouteTitle', {
    defaultMessage: 'License',
  });

  const { setIsDisabled } = useContext(MonitoringTimeContainer.Context);
  useEffect(() => {
    setIsDisabled(true);
    return () => {
      setIsDisabled(false);
    };
  }, [setIsDisabled]);

  const state = useContext(GlobalStateContext);
  const clusterUuid = state.cluster_uuid;
  const ccs = state.ccs;
  const [clusters, setClusters] = useState([] as any);

  const { services } = useKibana<{ data: any }>();
  const timezone = services.uiSettings?.get('dateFormat:tz');
  const uploadLicensePath = services.application?.getUrlForApp('management', {
    path: 'stack/license_management/upload_license',
  });

  const getPageData = useCallback(async () => {
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    let url = '../api/monitoring/v1/clusters';
    if (clusterUuid) {
      url += `/${clusterUuid}`;
    }

    try {
      const response = await services.http?.fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          ccs,
          timeRange: {
            min: bounds.min.toISOString(),
            max: bounds.max.toISOString(),
          },
          codePaths: CODE_PATHS,
        }),
      });

      setClusters(formatClusters(response));
    } catch (err) {
      // TODO handle error
    }
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http]);

  return (
    <PageTemplate title={title} pageTitle="" getPageData={getPageData}>
      {licenseComponent(clusters, timezone, uploadLicensePath)}
    </PageTemplate>
  );
};

function licenseComponent(
  clusters: any,
  timezone: string,
  uploadLicensePath: string | undefined
): any {
  if (clusters.length) {
    const cluster = clusters[0];
    const isPrimaryCluster = cluster.isPrimary;
    const license = cluster.license;
    let expiryDate = license?.expiry_date_in_millis;

    if (expiryDate !== undefined) {
      expiryDate = formatDateTimeLocal(expiryDate, timezone);
    }

    const isExpired = Date.now() > expiryDate;

    return (
      <License
        isPrimaryCluster={isPrimaryCluster}
        status={license.status}
        type={license.type}
        isExpired={isExpired}
        expiryDate={expiryDate}
        uploadLicensePath={uploadLicensePath}
      />
    );
  } else {
    return null;
  }
}

// From x-pack/plugins/monitoring/common/formatting.ts with corrected typing
// TODO open github issue to correct other usages
export function formatDateTimeLocal(date: number | Date, timezone: string | null) {
  return moment.tz(date, timezone || moment.tz.guess()).format('LL LTS');
}

function formatClusters(clusters: any) {
  return clusters.map(formatCluster);
}

function formatCluster(cluster: any) {
  if (cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID) {
    cluster.cluster_name = 'Standalone Cluster';
  }
  return cluster;
}
