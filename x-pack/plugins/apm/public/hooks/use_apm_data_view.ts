/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import { useEffect, useState } from 'react';
import { APM_STATIC_DATA_VIEW_ID } from '../../common/data_view_constants';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { ApmPluginStartDeps } from '../plugin';
import { callApmApi } from '../services/rest/create_call_apm_api';

async function createStaticApmDataView() {
  const res = await callApmApi('POST /internal/apm/data_view/static', {
    signal: null,
  });
  return res.dataView;
}

async function getApmDataViewTitle() {
  const res = await callApmApi('GET /internal/apm/data_view/title', {
    signal: null,
  });
  return res.apmDataViewTitle;
}

export function useApmDataView() {
  const { services } = useKibana<ApmPluginStartDeps>();
  const { core } = useApmPluginContext();
  const [dataView, setDataView] = useState<DataView | undefined>();

  const canCreateDataView =
    core.application.capabilities.savedObjectsManagement.edit;

  useEffect(() => {
    async function fetchDataView() {
      try {
        // load static data view
        return await services.dataViews.get(APM_STATIC_DATA_VIEW_ID);
      } catch (e) {
        // re-throw if an unhandled error occurred
        const notFound = e instanceof SavedObjectNotFound;
        if (!notFound) {
          throw e;
        }

        // create static data view if user has permissions
        if (canCreateDataView) {
          return createStaticApmDataView();
        } else {
          // or create dynamic data view if user does not have permissions to create a static
          const title = await getApmDataViewTitle();
          return services.dataViews.create({ title });
        }
      }
    }

    fetchDataView().then((dv) => setDataView(dv));
  }, [canCreateDataView, services.dataViews]);

  return { dataView };
}
