/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useCallback } from 'react';

import { EMPTY } from 'rxjs';
import type { StoryContext } from '@storybook/react';
import { createBrowserHistory } from 'history';

import { I18nProvider } from '@kbn/i18n-react';

import { ScopedHistory } from '../../../../../src/core/public';
import { getStorybookContextProvider } from '../../../../../src/plugins/custom_integrations/storybook';
import { IntegrationsAppContext } from '../../public/applications/integrations/app';
import type { FleetConfigType, FleetStartServices } from '../../public/plugin';

// TODO: These are contract leaks, and should be on the context, rather than a setter.
import { setHttpClient } from '../../public/hooks/use_request';
import { setCustomIntegrations } from '../../public/services/custom_integrations';

import { getApplication } from './application';
import { getChrome } from './chrome';
import { getHttp } from './http';
import { getUiSettings } from './ui_settings';
import { getNotifications } from './notifications';
import { stubbedStartServices } from './stubs';
import { getDocLinks } from './doc_links';
import { getCloud } from './cloud';
import { getShare } from './share';
import { getExecutionContext } from './execution_context';

// TODO: clintandrewhall - this is not ideal, or complete.  The root context of Fleet applications
// requires full start contracts of its dependencies.  As a result, we have to mock all of those contracts
// with Storybook equivalents.  This is a temporary solution, and should be replaced with a more complete
// mock later, (or, ideally, Fleet starts to use a service abstraction).
//
// Expect this to grow as components that are given Stories need access to mocked services.
export const StorybookContext: React.FC<{ storyContext?: StoryContext }> = ({
  storyContext,
  children: storyChildren,
}) => {
  const basepath = '';
  const browserHistory = createBrowserHistory();
  const history = new ScopedHistory(browserHistory, basepath);

  const isCloudEnabled = storyContext?.args.isCloudEnabled;

  const startServices: FleetStartServices = useMemo(
    () => ({
      ...stubbedStartServices,
      application: getApplication(),
      executionContext: getExecutionContext(),
      chrome: getChrome(),
      cloud: {
        ...getCloud({ isCloudEnabled }),
        CloudContextProvider: () => <></>,
      },
      customIntegrations: {
        ContextProvider: getStorybookContextProvider(),
      },
      docLinks: getDocLinks(),
      http: getHttp(),
      i18n: {
        Context: function I18nContext({ children }) {
          return <I18nProvider>{children}</I18nProvider>;
        },
      },
      injectedMetadata: {
        getInjectedVar: () => null,
      },
      notifications: getNotifications(),
      share: getShare(),
      uiSettings: getUiSettings(),
      theme: {
        theme$: EMPTY,
      },
      authz: {
        fleet: {
          all: true,
          setup: true,
          readEnrollmentTokens: true,
          readAgentPolicies: true,
        },
        integrations: {
          readPackageInfo: true,
          readInstalledPackages: true,
          installPackages: true,
          upgradePackages: true,
          uploadPackages: true,
          removePackages: true,
          readPackageSettings: true,
          writePackageSettings: true,
          readIntegrationPolicies: true,
          writeIntegrationPolicies: true,
        },
      },
    }),
    [isCloudEnabled]
  );
  useEffect(() => {
    setHttpClient(startServices.http);
    setCustomIntegrations({
      getAppendCustomIntegrations: async () => [],
      getReplacementCustomIntegrations: async () => {
        const { integrations } = await import('./fixtures/replacement_integrations');
        return integrations;
      },
    });
  }, [startServices]);

  const config = {
    enabled: true,
    agents: {
      enabled: true,
      elasticsearch: {},
    },
  } as unknown as FleetConfigType;

  const extensions = {};
  const theme$ = EMPTY;
  const kibanaVersion = '1.2.3';
  const setHeaderActionMenu = useCallback(() => {}, []);

  return (
    <IntegrationsAppContext
      {...{
        kibanaVersion,
        basepath,
        config,
        history,
        startServices,
        extensions,
        setHeaderActionMenu,
        theme$,
      }}
    >
      {storyChildren}
    </IntegrationsAppContext>
  );
};
