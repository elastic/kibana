/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { lazy, Suspense } from 'react';

import { I18nProvider } from '@kbn/i18n-react';
import type { KibanaServices } from '@kbn/kibana-react-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';

import type { ApiKeyFlyoutProps } from './api_key_flyout_types';
import { AuthenticationProvider } from '../../../components';

const ApiKeyFlyout = lazy(() => import('./api_key_flyout'));

export function renderApiKeyFlyout(
  props: ApiKeyFlyoutProps | undefined,
  deps: { authc: AuthenticationServiceSetup; services: KibanaServices }
): ReactElement | null {
  return props ? (
    <Suspense fallback={<></>}>
      <KibanaContextProvider services={deps.services}>
        <AuthenticationProvider authc={deps.authc}>
          <I18nProvider>
            <ApiKeyFlyout {...props} {...deps} />
          </I18nProvider>
        </AuthenticationProvider>
      </KibanaContextProvider>
    </Suspense>
  ) : null;
}
