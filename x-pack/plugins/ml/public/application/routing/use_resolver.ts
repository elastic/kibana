/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { IUiSettingsClient, SavedObjectsClientContract } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { getSavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  getDataViewById,
  getDataViewAndSavedSearch,
  type DataViewAndSavedSearch,
} from '../util/index_utils';
import { createSearchItems } from '../jobs/new_job/utils/new_job_utils';
import type { ResolverResults, Resolvers } from './resolvers';
import type { MlContextValue } from '../contexts/ml';
import { useNotifications } from '../contexts/kibana';
import { useCreateAndNavigateToMlLink } from '../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../common/constants/locator';

export interface GetSavedSearchPageDeps {
  search: DataPublicPluginStart['search'];
  savedObjectsClient: SavedObjectsClientContract;
}
/**
 * Hook to resolve route specific requirements
 * @param dataViewId optional Kibana data view id, used for wizards
 * @param savedSearchId optional Kibana saved search id, used for wizards
 * @param config Kibana UI Settings
 * @param resolvers an array of resolvers to be executed for the route
 * @return { context, results } returns the ML context and resolver results
 */
export const useResolver = (
  dataViewId: string | undefined,
  savedSearchId: string | undefined,
  config: IUiSettingsClient,
  dataViewsContract: DataViewsContract,
  getSavedSearchDeps: {
    search: DataPublicPluginStart['search'];
    savedObjectsClient: SavedObjectsClientContract;
  },
  resolvers: Resolvers
): { context: MlContextValue; results: ResolverResults } => {
  const notifications = useNotifications();

  const funcNames = Object.keys(resolvers); // Object.entries gets this wrong?!
  const funcs = Object.values(resolvers); // Object.entries gets this wrong?!
  const tempResults = funcNames.reduce((p, c) => {
    p[c] = {};
    return p;
  }, {} as ResolverResults);

  const [context, setContext] = useState<any | null>(null);
  const [results, setResults] = useState(tempResults);
  const redirectToJobsManagementPage = useCreateAndNavigateToMlLink(
    ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await Promise.all(funcs.map((r) => r()));
        res.forEach((r, i) => (tempResults[funcNames[i]] = r));
        setResults(tempResults);
      } catch (error) {
        // quietly fail. Errors being thrown here are expected as a way to handle privilege or license check failures.
        // The user will be redirected by the failed resolver.
        return;
      }

      try {
        if (dataViewId === '') {
          throw new Error(
            i18n.translate('xpack.ml.useResolver.errorIndexPatternIdEmptyString', {
              defaultMessage: 'dataViewId must not be empty string.',
            })
          );
        }

        let dataViewAndSavedSearch: DataViewAndSavedSearch = {
          savedSearch: null,
          dataView: null,
        };
        let savedSearch = null;

        if (savedSearchId !== undefined) {
          savedSearch = await getSavedSearch(savedSearchId, getSavedSearchDeps);
          dataViewAndSavedSearch = await getDataViewAndSavedSearch(savedSearchId);
        } else if (dataViewId !== undefined) {
          dataViewAndSavedSearch.dataView = await getDataViewById(dataViewId);
        }

        const { savedSearch: deprecatedSavedSearchObj, dataView } = dataViewAndSavedSearch;

        const { combinedQuery } = createSearchItems(
          config,
          dataView !== null ? dataView : undefined,
          deprecatedSavedSearchObj
        );

        setContext({
          combinedQuery,
          currentDataView: dataView,
          deprecatedSavedSearchObj,
          selectedSavedSearch: savedSearch,
          dataViewsContract,
          kibanaConfig: config,
        });
      } catch (error) {
        // an unexpected error has occurred. This could be caused by an incorrect index pattern or saved search ID
        notifications.toasts.addError(new Error(error), {
          title: i18n.translate('xpack.ml.useResolver.errorTitle', {
            defaultMessage: 'An error has occurred',
          }),
        });
        await redirectToJobsManagementPage();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { context, results };
};
