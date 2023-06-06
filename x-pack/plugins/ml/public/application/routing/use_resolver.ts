/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { IUiSettingsClient } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { parse } from 'query-string';
import { MlCapabilitiesKey } from '../../../common/types/capabilities';
import { usePermissionCheck } from '../capabilities/check_capabilities';
import { getSavedSearch } from '../util/dependency_cache';
import {
  getDataViewById,
  getDataViewAndSavedSearch,
  type DataViewAndSavedSearch,
} from '../util/index_utils';
import { createSearchItems } from '../jobs/new_job/utils/new_job_utils';
import type { ResolverResults, Resolvers } from './resolvers';
import type { MlContextValue } from '../contexts/ml';
import { useMlKibana, useNotifications } from '../contexts/kibana';
import { useCreateAndNavigateToMlLink } from '../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../common/constants/locator';

/**
 * Resolves required dependencies for landing on the page
 * @param license
 * @param requiredCapabilities
 */
export const useRouteResolver = (
  license: 'full' | 'basic',
  requiredCapabilities: MlCapabilitiesKey[],
  customResolvers?: Resolvers
): { context: MlContextValue | null; results: ResolverResults } => {
  const [context, setContext] = useState<MlContextValue | null>(null);
  const [results, setResults] = useState<any>(null);

  const location = useLocation();
  const { index: dataViewId, savedSearchId } = parse(location.search, {
    sort: false,
  }) as { index: string; savedSearchId: string };

  const {
    services: {
      mlServices: { mlCapabilities },
      uiSettings,
      data: { dataViews },
      savedSearch: savedSearchService,
    },
  } = useMlKibana();

  useEffect(
    function refreshCapabilitiesOnMount() {
      mlCapabilities.refreshCapabilities();
    },
    [mlCapabilities]
  );

  // Check if the user has all required permissions
  const capabilitiesResults = usePermissionCheck(requiredCapabilities);

  /**
   * TODO revisit this callback and the way we resolce data view and saved search
   * as it's not optimal
   */
  const getDataViewAndSavedSearchCallback = useCallback(
    async (ssId: string) => {
      const resp: DataViewAndSavedSearch = {
        savedSearch: null,
        dataView: null,
      };

      if (ssId === undefined) {
        return resp;
      }

      const ss = await savedSearchService.get(ssId);
      if (ss === null) {
        return resp;
      }
      const dataViewIdTemp = ss.references?.find((r) => r.type === 'index-pattern')?.id;
      resp.dataView = await dataViews.get(dataViewIdTemp!);
      resp.savedSearch = ss;
      return resp;
    },
    [savedSearchService, dataViews]
  );

  /**
   * Resolve data view or saved search if exist in the URL.
   */
  const resolveDataSource = useCallback(async () => {
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
      savedSearch = await savedSearchService.get(savedSearchId);
      dataViewAndSavedSearch = await getDataViewAndSavedSearchCallback(savedSearchId);
    } else if (dataViewId !== undefined) {
      dataViewAndSavedSearch.dataView = await dataViews.get(dataViewId);
    }

    const { savedSearch: deprecatedSavedSearchObj, dataView } = dataViewAndSavedSearch;

    const { combinedQuery } = createSearchItems(
      uiSettings,
      dataView !== null ? dataView : undefined,
      deprecatedSavedSearchObj
    );

    return {
      combinedQuery,
      currentDataView: dataView,
      deprecatedSavedSearchObj,
      selectedSavedSearch: savedSearch,
    };
  }, [
    dataViewId,
    savedSearchId,
    uiSettings,
    dataViews,
    savedSearchService,
    getDataViewAndSavedSearchCallback,
  ]);

  const resolveCustomResolvers = useCallback(async () => {
    if (!customResolvers) return;

    const funcNames = Object.keys(customResolvers); // Object.entries gets this wrong?!
    const funcs = Object.values(customResolvers); // Object.entries gets this wrong?!
    const tempResults = funcNames.reduce((p, c) => {
      p[c] = {};
      return p;
    }, {} as ResolverResults);
    const res = await Promise.all(funcs.map((r) => r()));
    res.forEach((r, i) => (tempResults[funcNames[i]] = r));

    return tempResults;
  }, [customResolvers]);

  if (capabilitiesResults.some((v) => v === false)) {
    // Redirect to access denied
    // return '';
  }

  useEffect(
    function resolveOnMount() {
      Promise.all([resolveDataSource(), resolveCustomResolvers()])
        .then(([partialContext, customResults]) => {
          setResults(customResults);

          setContext({
            ...partialContext,
            dataViewsContract: dataViews,
            kibanaConfig: uiSettings,
          } as MlContextValue);
        })
        .catch((e) => {
          // TODO add error handling
          console.log(e, '___e___');
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
    // [dataViews, uiSettings, resolveDataSource, resolveCustomResolvers]
  );

  return { context, results };
};

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
          savedSearch = await getSavedSearch().get(savedSearchId);
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
