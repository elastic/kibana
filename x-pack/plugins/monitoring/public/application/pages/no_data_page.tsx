/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useState } from 'react';
import { Redirect } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { NoData } from '../../components/no_data';
import { PageTemplate } from './page_template';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CODE_PATH_LICENSE, STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import { Legacy } from '../../legacy_shims';
import { GlobalStateContext } from '../global_state_context';

const CODE_PATHS = [CODE_PATH_LICENSE];

export const NoDataPage = () => {
  const title = i18n.translate('xpack.monitoring.noData.routeTitle', {
    defaultMessage: 'Setup Monitoring',
  });

  const { services } = useKibana<{ data: any }>();

  const state = useContext(GlobalStateContext);
  const clusterUuid = state.cluster_uuid;
  const ccs = state.ccs;

  const [shouldRedirect, setShouldRedirect] = useState(false);

  const [model, setModel] = useState({
    errors: [], // errors can happen from trying to check or set ES settings
    checkMessage: null, // message to show while waiting for api response
    isLoading: true, // flag for in-progress state of checking for no data reason
    isCollectionEnabledUpdating: false, // flags to indicate whether to show a spinner while waiting for ajax
    isCollectionEnabledUpdated: false,
    isCollectionIntervalUpdating: false,
    isCollectionIntervalUpdated: false,
  } as any);

  // From x-pack/plugins/monitoring/public/views/no_data/model_updater.js
  const updateModel = (properties: any) => {
    const updated = { ...model };
    const keys = Object.keys(properties);

    keys.forEach((key) => {
      if (Array.isArray(updated[key])) {
        updated[key].push(properties[key]);
      } else {
        updated[key] = properties[key];
      }
    });
    setModel(updated);
  };

  // TODO work on porting these checkers over
  // const checkers = [new ClusterSettingsChecker($http), new NodeSettingsChecker($http)];
  // await startChecks(checkers, updateModel);

  const getPageData = useCallback(async () => {
    updateModel({ isLoading: true });
    const bounds = services.data?.query.timefilter.timefilter.getBounds();
    const min = bounds.min.toISOString();
    const max = bounds.max.toISOString();

    const url = '../api/monitoring/v1/clusters';

    try {
      const response = await services.http?.fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          css: undefined,
          timeRange: {
            min,
            max,
          },
          codePaths: CODE_PATHS,
        }),
      });

      const clusters = formatClusters(response);
      updateModel({ isLoading: false });
      console.log('did a refresh from no data page');

      if (clusters && clusters.length) {
        setShouldRedirect(true);
      }
    } catch (err) {
      // TODO something useful with the error reason
      // if (err && err.status === 503) {
      //   catchReason = {
      //     property: 'custom',
      //     message: err.data.message,
      //   };
      // }
      console.log(err);
    }
  }, [ccs, clusterUuid, services.data?.query.timefilter.timefilter, services.http]);

  const enabler = new Enabler(updateModel);

  return (
    <PageTemplate title={title} getPageData={getPageData}>
      {shouldRedirect ? (
        <Redirect to="/home" />
      ) : (
        <NoData {...model} enabler={enabler} isCloudEnabled={Legacy.shims.isCloud} />
      )}
    </PageTemplate>
  );
};

function formatClusters(clusters: any) {
  return clusters.map(formatCluster);
}

function formatCluster(cluster: any) {
  if (cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID) {
    cluster.cluster_name = 'Standalone Cluster';
  }
  return cluster;
}

// From x-pack/plugins/monitoring/public/lib/elasticsearch_settings/enabler.js
class Enabler {
  updateModel: any;

  constructor(updateModel: (properties: any) => void) {
    this.updateModel = updateModel;
  }

  async enableCollectionInterval() {
    try {
      this.updateModel({ isCollectionIntervalUpdating: true });
      // TODO actually set it
      // await this.$http.put('../api/monitoring/v1/elasticsearch_settings/set/collection_interval');
      this.updateModel({
        isCollectionIntervalUpdated: true,
        isCollectionIntervalUpdating: false,
      });
    } catch (err) {
      this.updateModel({
        errors: (err as any).data,
        isCollectionIntervalUpdated: false,
        isCollectionIntervalUpdating: false,
      });
    }
  }

  async enableCollectionEnabled() {
    try {
      this.updateModel({ isCollectionEnabledUpdating: true });
      // TODO actually set it
      // await this.$http.put('../api/monitoring/v1/elasticsearch_settings/set/collection_enabled');
      this.updateModel({
        isCollectionEnabledUpdated: true,
        isCollectionEnabledUpdating: false,
      });
    } catch (err) {
      this.updateModel({
        errors: (err as any).data,
        isCollectionEnabledUpdated: false,
        isCollectionEnabledUpdating: false,
      });
    }
  }
}
