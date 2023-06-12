/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import useMount from 'react-use/lib/useMount';
import { PLUGIN_ID } from '../../../common/constants/app';
import { useMlKibana, useMlLicenseInfo } from '../contexts/kibana';
import { type MlCapabilitiesKey } from '../../../common/types/capabilities';
import { usePermissionCheck } from '../capabilities/check_capabilities';
import type { ResolverResults, Resolvers } from './resolvers';
import type { MlContextValue } from '../contexts/ml';
import { ML_APP_LOCATOR, ML_PAGES } from '../../../common/constants/locator';

/**
 * Resolves required dependencies for landing on the page
 * and performs redirects if needed.
 *
 * @param requiredLicence
 * @param requiredCapabilities
 */
export const useRouteResolver = (
  requiredLicence: 'full' | 'basic',
  requiredCapabilities: MlCapabilitiesKey[],
  customResolvers?: Resolvers
): { context: MlContextValue | null; results: ResolverResults; component?: React.Component } => {
  const customResolversRef = useRef(customResolvers);

  const [results, setResults] = useState<ResolverResults>();
  const [context, setContext] = useState<MlContextValue | null>(null);

  const {
    services: {
      application: { navigateToApp, navigateToUrl },
      mlServices: { mlCapabilities },
      uiSettings,
      data: { dataViews },
      notifications,
      share: {
        url: { locators },
      },
    },
  } = useMlKibana();

  const mlLicenseInfo = useMlLicenseInfo();

  useMount(function refreshCapabilitiesOnMount() {
    mlCapabilities.refreshCapabilities();
  });

  const licenseResolver = useCallback(async () => {
    if (mlLicenseInfo.isMlEnabled === false || mlLicenseInfo.isMinimumLicense === false) {
      // ML is not enabled or the license isn't at least basic
      await navigateToApp('home');
      return Promise.reject();
    }
    if (requiredLicence === 'full' && mlLicenseInfo.isFullLicense === false) {
      // ML is enabled, but only with a basic or gold license
      await navigateToApp(PLUGIN_ID, { path: ML_PAGES.DATA_VISUALIZER });
      return Promise.reject();
    }
    if (mlLicenseInfo.hasLicenseExpired) {
      await navigateToUrl(
        await locators.get('LICENSE_MANAGEMENT_LOCATOR')!.getUrl({
          page: 'dashboard',
        })
      );
      return Promise.reject();
    }

    return true;
  }, [
    locators,
    mlLicenseInfo.hasLicenseExpired,
    mlLicenseInfo.isFullLicense,
    mlLicenseInfo.isMinimumLicense,
    mlLicenseInfo.isMlEnabled,
    navigateToApp,
    navigateToUrl,
    requiredLicence,
  ]);

  const redirectToMlAccessDeniedPage = useCallback(async () => {
    const redirectPage = mlLicenseInfo.hasLicenseExpired
      ? locators.get('LICENSE_MANAGEMENT_LOCATOR')!.getUrl({
          page: 'dashboard',
        })
      : locators.get(ML_APP_LOCATOR)!.getUrl({
          page: ML_PAGES.ACCESS_DENIED,
        });

    await navigateToUrl(await redirectPage);
  }, [locators, navigateToUrl, mlLicenseInfo.hasLicenseExpired]);

  // Check if the user has all required permissions
  const capabilitiesResults = usePermissionCheck(requiredCapabilities);

  const capabilitiesResolver = useCallback(async () => {
    if (capabilitiesResults.some((v) => !v)) {
      await redirectToMlAccessDeniedPage();
      return Promise.reject();
    }
    return true;
  }, [capabilitiesResults, redirectToMlAccessDeniedPage]);

  const resolveCustomResolvers = useCallback(async () => {
    if (!customResolversRef.current) return;

    const funcNames = Object.keys(customResolversRef.current); // Object.entries gets this wrong?!
    const funcs = Object.values(customResolversRef.current); // Object.entries gets this wrong?!
    const tempResults = funcNames.reduce((p, c) => {
      p[c] = {};
      return p;
    }, {} as Exclude<ResolverResults, undefined>);
    const res = await Promise.all(funcs.map((r) => r()));
    res.forEach((r, i) => (tempResults[funcNames[i]] = r));

    return tempResults;
  }, []);

  useEffect(
    function resolveRequirements() {
      let mounted = true;

      // Sequence is important
      licenseResolver()
        .then(capabilitiesResolver)
        .then(resolveCustomResolvers)
        .then((customResults) => {
          if (mounted) {
            setContext({
              dataViewsContract: dataViews,
              kibanaConfig: uiSettings,
              initialized: true,
            } as MlContextValue);
            setResults(customResults);
          }
        })
        .catch((rejectedValue) => {
          if (rejectedValue instanceof Error) {
            notifications.toasts.addError(rejectedValue, {
              title: i18n.translate('xpack.ml.useResolver.errorTitle', {
                defaultMessage: 'An error has occurred',
              }),
            });
          }
        });

      return () => {
        mounted = false;
      };
    },
    [
      licenseResolver,
      mlLicenseInfo,
      capabilitiesResolver,
      notifications.toasts,
      resolveCustomResolvers,
      dataViews,
      uiSettings,
    ]
  );

  return { context, results };
};
