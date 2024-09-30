/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import useMount from 'react-use/lib/useMount';
import { AccessDeniedCallout } from '../access_denied';
import { PLUGIN_ID } from '../../../common/constants/app';
import { useMlApi, useMlKibana, useMlLicenseInfo } from '../contexts/kibana';
import { type MlCapabilitiesKey } from '../../../common/types/capabilities';
import { usePermissionCheck } from '../capabilities/check_capabilities';
import type { ResolverResults, Resolvers } from './resolvers';
import { ML_PAGES } from '../../../common/constants/locator';

export interface RouteResolverContext {
  initialized: boolean;
  resolvedComponent?: React.ReactElement;
}

/**
 * Resolves required dependencies for landing on the page
 * and performs redirects if needed.
 *
 * @param requiredLicense
 * @param requiredCapabilities
 */
export const useRouteResolver = (
  requiredLicense: 'full' | 'basic',
  requiredCapabilities: MlCapabilitiesKey[],
  customResolvers?: Resolvers
): {
  context: RouteResolverContext;
  results: ResolverResults;
} => {
  const requiredCapabilitiesRef = useRef(requiredCapabilities);
  const customResolversRef = useRef(customResolvers);

  const [results, setResults] = useState<ResolverResults>();
  const [context, setContext] = useState<RouteResolverContext>({ initialized: false });

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
  const mlApi = useMlApi();
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
    if (requiredLicense === 'full' && mlLicenseInfo.isFullLicense === false) {
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
    requiredLicense,
  ]);

  // Check if the user has all required permissions
  const capabilitiesResults = usePermissionCheck(requiredCapabilities);

  const capabilitiesResolver = useCallback(async () => {
    const missingCapabilities = requiredCapabilitiesRef.current.filter(
      (k, i) => !capabilitiesResults[i]
    );
    if (missingCapabilities.length > 0) {
      setContext({
        initialized: true,
        resolvedComponent: <AccessDeniedCallout missingCapabilities={missingCapabilities} />,
      });
      return Promise.reject();
    }
    return true;
  }, [capabilitiesResults]);

  const resolveCustomResolvers = useCallback(async () => {
    if (!customResolversRef.current) return;

    const funcNames = Object.keys(customResolversRef.current); // Object.entries gets this wrong?!
    const funcs = Object.values(customResolversRef.current); // Object.entries gets this wrong?!
    const tempResults = funcNames.reduce((p, c) => {
      p[c] = {};
      return p;
    }, {} as Exclude<ResolverResults, undefined>);
    const res = await Promise.all(funcs.map((r) => r(mlApi)));
    res.forEach((r, i) => (tempResults[funcNames[i]] = r));

    return tempResults;
    // skip mlApi from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              initialized: true,
            });
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
