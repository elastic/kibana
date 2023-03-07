/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { LocatorGetUrlParams } from '@kbn/share-plugin/common/url_service';
import { useUrlState } from '@kbn/ml-url-state';
import { useMlKibana } from './kibana_context';
import { ML_APP_LOCATOR } from '../../../../common/constants/locator';
import { MlLocatorParams } from '../../../../common/types/locator';

export const useMlLocator = () => {
  const {
    services: { share },
  } = useMlKibana();

  return share.url.locators.get(ML_APP_LOCATOR);
};

export const useMlLink = (params: MlLocatorParams, getUrlParams?: LocatorGetUrlParams): string => {
  const [href, setHref] = useState<string>(params.page);
  const mlLocator = useMlLocator();

  useEffect(() => {
    let isCancelled = false;
    const generateUrl = async (_params: MlLocatorParams) => {
      if (mlLocator) {
        const url = await mlLocator.getUrl(_params, getUrlParams);
        if (!isCancelled) {
          setHref(url);
        }
      }
    };
    generateUrl(params);
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, getUrlParams]);

  return href;
};

export const useCreateAndNavigateToMlLink = (
  page: MlLocatorParams['page']
): (() => Promise<void>) => {
  const mlLocator = useMlLocator();
  const [globalState] = useUrlState('_g');

  const {
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();

  const redirectToMlPage = useCallback(
    async (_page: MlLocatorParams['page']) => {
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
      const url = await mlLocator.getUrl({ page: _page, pageState });
      await navigateToUrl(url);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mlLocator, navigateToUrl]
  );

  // returns the onClick callback
  return useCallback(() => redirectToMlPage(page), [redirectToMlPage, page]);
};
