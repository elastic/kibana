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
} from '../util/index_utils';
import { createSearchItems } from '../jobs/new_job/utils/new_job_utils';
import { ResolverResults, Resolvers } from './resolvers';
import { MlContextValue } from '../contexts/ml';
import { useNotifications } from '../contexts/kibana';

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

      if (indexPatternId !== undefined || savedSearchId !== undefined) {
        try {
          // note, currently we're using our own kibana context that requires a current index pattern to be set
          // this means, if the page uses this context, useResolver must be passed a string for the index pattern id
          // and loadIndexPatterns must be part of the resolvers.
          const { indexPattern, savedSearch } =
            savedSearchId !== undefined
              ? await getIndexPatternAndSavedSearch(savedSearchId)
              : { savedSearch: null, indexPattern: await getIndexPatternById(indexPatternId!) };

          const { combinedQuery } = createSearchItems(config, indexPattern!, savedSearch);

          setContext({
            combinedQuery,
            currentIndexPattern: indexPattern,
            currentSavedSearch: savedSearch,
            indexPatterns: getIndexPatternsContract()!,
            kibanaConfig: config,
          });
        } catch (error) {
          // an unexpected error has occurred. This could be caused by an incorrect index pattern or saved search ID
          notifications.toasts.addError(new Error(error), {
            title: i18n.translate('xpack.ml.useResolver.errorTitle', {
              defaultMessage: 'An error has occurred',
            }),
          });
          window.location.href = '#/';
        }
      } else {
        setContext({});
      }
    })();
  }, []);

  return { context, results };
};
