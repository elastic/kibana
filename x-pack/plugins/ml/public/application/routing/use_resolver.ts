/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { IUiSettingsClient } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import {
  getIndexPatternById,
  getIndexPatternsContract,
  getIndexPatternAndSavedSearch,
  IndexPatternAndSavedSearch,
} from '../util/index_utils';
import { createSearchItems } from '../jobs/new_job/utils/new_job_utils';
import { ResolverResults, Resolvers } from './resolvers';
import { MlContextValue } from '../contexts/ml';
import { useNotifications } from '../contexts/kibana';
import { useCreateAndNavigateToMlLink } from '../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../common/constants/ml_url_generator';

/**
 * Hook to resolve route specific requirements
 * @param indexPatternId optional Kibana index pattern id, used for wizards
 * @param savedSearchId optional Kibana saved search id, used for wizards
 * @param config Kibana UI Settings
 * @param resolvers an array of resolvers to be executed for the route
 * @return { context, results } returns the ML context and resolver results
 */
export const useResolver = (
  indexPatternId: string | undefined,
  savedSearchId: string | undefined,
  config: IUiSettingsClient,
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
        if (indexPatternId === '') {
          throw new Error(
            i18n.translate('xpack.ml.useResolver.errorIndexPatternIdEmptyString', {
              defaultMessage: 'indexPatternId must not be empty string.',
            })
          );
        }

        let indexPatternAndSavedSearch: IndexPatternAndSavedSearch = {
          savedSearch: null,
          indexPattern: null,
        };

        if (savedSearchId !== undefined) {
          indexPatternAndSavedSearch = await getIndexPatternAndSavedSearch(savedSearchId);
        } else if (indexPatternId !== undefined) {
          indexPatternAndSavedSearch.indexPattern = await getIndexPatternById(indexPatternId);
        }

        const { savedSearch, indexPattern } = indexPatternAndSavedSearch;

        const { combinedQuery } = createSearchItems(
          config,
          indexPattern !== null ? indexPattern : undefined,
          savedSearch
        );

        setContext({
          combinedQuery,
          currentIndexPattern: indexPattern,
          currentSavedSearch: savedSearch,
          indexPatterns: getIndexPatternsContract(),
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
  }, []);

  return { context, results };
};
