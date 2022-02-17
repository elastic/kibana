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
import { NoData } from '../../../components/no_data';
import { PageTemplate } from '../page_template';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { CODE_PATH_LICENSE, STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../../common/constants';
import { Legacy } from '../../../legacy_shims';
import { Enabler } from './enabler';
import { BreadcrumbContainer } from '../../hooks/use_breadcrumbs';
import { initSetupModeState } from '../../../lib/setup_mode';
import { GlobalStateContext } from '../../contexts/global_state_context';
import { useRequestErrorHandler } from '../../hooks/use_request_error_handler';

const CODE_PATHS = [CODE_PATH_LICENSE];

interface NoDataPageSetupDeps {
  http: any;
  data: any;
}

interface SettingsChecker {
  message: string;
  api: string;
  next?: SettingsChecker;
}

const clusterCheckers: SettingsChecker[] = [
  {
    message: i18n.translate('xpack.monitoring.noData.checker.clusterSettings', {
      defaultMessage: 'Checking cluster settings API on production cluster',
    }),
    api: '../api/monitoring/v1/elasticsearch_settings/check/cluster',
  },
  {
    message: i18n.translate('xpack.monitoring.noData.checker.nodesSettings', {
      defaultMessage: 'Checking nodes settings API on production cluster',
    }),
    api: '../api/monitoring/v1/elasticsearch_settings/check/nodes',
  },
];

export const NoDataPage = () => {
  const title = i18n.translate('xpack.monitoring.noData.routeTitle', {
    defaultMessage: 'Setup Monitoring',
  });

  const { services } = useKibana<NoDataPageSetupDeps>();
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

  const { update: updateBreadcrumbs } = useContext(BreadcrumbContainer.Context);
  updateBreadcrumbs([
    {
      'data-test-subj': 'breadcrumbClusters',
      text: 'Clusters',
      href: '#/home',
      ignoreGlobalState: true,
    },
  ]);

  const globalState = useContext(GlobalStateContext);
  const handleRequestError = useRequestErrorHandler();
  initSetupModeState(globalState, services.http, handleRequestError);

  // From x-pack/plugins/monitoring/public/views/no_data/model_updater.js
  const updateModel = useCallback(
    (properties: any) => {
      setModel((previousModel: any) => {
        const updated = { ...previousModel };
        const keys = Object.keys(properties);

        keys.forEach((key) => {
          if (Array.isArray(updated[key])) {
            updated[key].push(properties[key]);
          } else {
            updated[key] = properties[key];
          }
        });

        return updated;
      });
    },
    [setModel]
  );

  const getPageData = useCallback(async () => {
    let catchReason;
    try {
      const clusters = await getClusters(services);

      if (clusters && clusters.length) {
        setShouldRedirect(true);
        return;
      }
    } catch (err) {
      if (err && err.status === 503) {
        catchReason = {
          property: 'custom',
          message: err.data.message,
        };
      }
    }

    if (catchReason) {
      updateModel({ reason: catchReason });
    } else {
      await startChecks(clusterCheckers, services.http, updateModel);
    }
  }, [services, updateModel]);

  const enabler = new Enabler(services.http, updateModel);

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

async function getClusters(services: NoDataPageSetupDeps): Promise<any[]> {
  const url = '../api/monitoring/v1/clusters';
  const bounds = services.data?.query.timefilter.timefilter.getBounds();
  const min = bounds.min.toISOString();
  const max = bounds.max.toISOString();

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

  return formatClusters(response);
}

// From x-pack/plugins/monitoring/public/lib/elasticsearch_settings/start_checks.js
const mapCheckers = (_checkers: SettingsChecker[]) => {
  return _checkers.map((current, checkerIndex) => {
    const next = _checkers[checkerIndex + 1];
    if (next !== undefined) {
      current.next = next;
    }

    return current;
  });
};

// From x-pack/plugins/monitoring/public/lib/elasticsearch_settings/start_checks.js
function startChecks(
  checkers: SettingsChecker[],
  http: { fetch: any },
  updateModel: (properties: any) => void
) {
  const runCheck = async (currentChecker: SettingsChecker): Promise<any> => {
    updateModel({ checkMessage: currentChecker.message });

    const { found, reason, error, errorReason } = await executeCheck(currentChecker, http);

    if (error) {
      updateModel({ errors: errorReason });
      if (currentChecker.next) {
        return runCheck(currentChecker.next);
      }
    } else if (found) {
      return updateModel({
        reason,
        isLoading: false,
        checkMessage: null,
      });
    } else if (currentChecker.next) {
      return runCheck(currentChecker.next);
    }

    // dead end
    updateModel({
      reason: null,
      isLoading: false,
      checkMessage: null,
    });
  };

  const _checkers = mapCheckers(checkers);
  return runCheck(_checkers[0]);
}

async function executeCheck(checker: SettingsChecker, http: { fetch: any }): Promise<any> {
  try {
    const response = await http.fetch(checker.api, {
      method: 'GET',
    });
    const { found, reason } = response;

    return { found, reason };
  } catch (err: any) {
    return {
      error: true,
      found: false,
      errorReason: err.body,
    };
  }
}

function formatClusters(clusters: any): any[] {
  return clusters.map(formatCluster);
}

function formatCluster(cluster: any) {
  if (cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID) {
    cluster.cluster_name = 'Standalone Cluster';
  }
  return cluster;
}
