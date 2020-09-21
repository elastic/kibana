/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMlKibana } from './kibana_context';
import { ML_APP_URL_GENERATOR } from '../../../../common/constants/ml_url_generator';
import { MlUrlGeneratorState } from '../../../../common/types/ml_url_generator';
import { useUrlState } from '../../util/url_state';

export const useMlUrlGenerator = () => {
  const {
    services: {
      share: {
        urlGenerators: { getUrlGenerator },
      },
    },
  } = useMlKibana();

  return getUrlGenerator(ML_APP_URL_GENERATOR);
};

export const useMlLink = (params: MlUrlGeneratorState): string => {
  const [href, setHref] = useState<string>(params.page);
  const mlUrlGenerator = useMlUrlGenerator();

  useEffect(() => {
    let isCancelled = false;
    const generateUrl = async (_params: MlUrlGeneratorState) => {
      const url = await mlUrlGenerator.createUrl(_params);
      if (!isCancelled) {
        setHref(url);
      }
    };
    generateUrl(params);
    return () => {
      isCancelled = true;
    };
  }, [params]);

  return href;
};

export const useCreateAndNavigateToMlLink = (
  page: MlUrlGeneratorState['page']
): (() => Promise<void>) => {
  const mlUrlGenerator = useMlUrlGenerator();
  const [globalState] = useUrlState('_g');

  const {
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();

  const redirectToMlPage = useCallback(
    async (_page: MlUrlGeneratorState['page']) => {
      const pageState =
        globalState?.refreshInterval !== undefined
          ? {
              globalState: {
                refreshInterval: globalState.refreshInterval,
              },
            }
          : undefined;

      // TODO: fix ts only interpreting it as MlUrlGenericState if pageState is passed
      // @ts-ignore
      const url = await mlUrlGenerator.createUrl({ page: _page, pageState });
      await navigateToUrl(url);
    },
    [mlUrlGenerator, navigateToUrl]
  );

  // returns the onClick callback
  return useCallback(() => redirectToMlPage(page), [redirectToMlPage, page]);
};
