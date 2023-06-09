/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import useMount from 'react-use/lib/useMount';
import { PLUGIN_ID } from '../../../common/constants/app';
import { showExpiredLicenseWarning } from '../license/expired_warning';
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
): { context: MlContextValue | null; results: ResolverResults } => {
  const [results, setResults] = useState<any>(null);

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

  const context = useMemo<MlContextValue>(() => {
    return {
      dataViewsContract: dataViews,
      kibanaConfig: uiSettings,
    } as MlContextValue;
  }, [dataViews, uiSettings]);

  const mlLicenseInfo = useMlLicenseInfo();

  const licenseResolver = useCallback(async () => {
    if (mlLicenseInfo.isMlEnabled === false || mlLicenseInfo.isMinimumLicense === false) {
      // ML is not enabled or the license isn't at least basic
      await navigateToApp('home');
      return;
    }
    if (requiredLicence === 'full' && mlLicenseInfo.isFullLicense === false) {
      // ML is enabled, but only with a basic or gold license
      await navigateToApp(PLUGIN_ID, { path: ML_PAGES.DATA_VISUALIZER });
      return;
    }
    // ML is enabled
    if (mlLicenseInfo.hasLicenseExpired) {
      showExpiredLicenseWarning();
    }
  }, [mlLicenseInfo, navigateToApp, requiredLicence]);

  useEffect(
    function trackLicense() {
      licenseResolver();
    },
    [licenseResolver, mlLicenseInfo]
  );

  useMount(function refreshCapabilitiesOnMount() {
    mlCapabilities.refreshCapabilities();
  });

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

  if (capabilitiesResults.some((v) => v === false)) {
    redirectToMlAccessDeniedPage();
  }

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

  useEffect(
    function resolveOnMount() {
      let mounted = true;
      resolveCustomResolvers()
        .then((customResults) => {
          if (mounted) {
            setResults(customResults);
          }
        })
        .catch((error) => {
          // an unexpected error has occurred. This could be caused by an incorrect index pattern or saved search ID
          notifications.toasts.addError(new Error(error), {
            title: i18n.translate('xpack.ml.useResolver.errorTitle', {
              defaultMessage: 'An error has occurred',
            }),
          });
        });

      return () => {
        mounted = false;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { context, results };
};
