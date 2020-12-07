/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';
import { i18n } from '@kbn/i18n';
import {
  EuiPageContent,
  EuiEmptyPrompt,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';

import {
  APP_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
  LICENSED_SUPPORT_URL,
} from '../../../../common/constants';

import { EuiButtonTo } from '../react_router_helpers';
import { SetAppSearchChrome, SetWorkplaceSearchChrome } from '../kibana_chrome';
import { SendAppSearchTelemetry, SendWorkplaceSearchTelemetry } from '../telemetry';
import { LicensingLogic } from '../licensing';

import { AppSearchLogo } from './assets/app_search_logo';
import { WorkplaceSearchLogo } from './assets/workplace_search_logo';
import './assets/logo.scss';

interface NotFoundProps {
  // Expects product plugin constants (@see common/constants.ts)
  product: {
    ID: string;
    SUPPORT_URL: string;
  };
}

export const NotFound: React.FC<NotFoundProps> = ({ product = {} }) => {
  const { hasGoldLicense } = useValues(LicensingLogic);
  const supportUrl = hasGoldLicense ? LICENSED_SUPPORT_URL : product.SUPPORT_URL;

  let Logo;
  let SetPageChrome;
  let SendTelemetry;

  switch (product.ID) {
    case APP_SEARCH_PLUGIN.ID:
      Logo = AppSearchLogo;
      SetPageChrome = SetAppSearchChrome;
      SendTelemetry = SendAppSearchTelemetry;
      break;
    case WORKPLACE_SEARCH_PLUGIN.ID:
      Logo = WorkplaceSearchLogo;
      SetPageChrome = SetWorkplaceSearchChrome;
      SendTelemetry = SendWorkplaceSearchTelemetry;
      break;
    default:
      return null;
  }

  return (
    <>
      <SetPageChrome />
      <SendTelemetry action="error" metric="not_found" />

      <EuiPageContent>
        <EuiEmptyPrompt
          title={<Logo />}
          body={
            <>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.enterpriseSearch.notFound.title', {
                    defaultMessage: '404 error',
                  })}
                </h2>
              </EuiTitle>
              <p>
                {i18n.translate('xpack.enterpriseSearch.notFound.description', {
                  defaultMessage: 'The page you’re looking for was not found.',
                })}
              </p>
            </>
          }
          actions={
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButtonTo to="/" color="primary" fill>
                  {i18n.translate('xpack.enterpriseSearch.notFound.action1', {
                    defaultMessage: 'Back to your dashboard',
                  })}
                </EuiButtonTo>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton href={supportUrl} target="_blank">
                  {i18n.translate('xpack.enterpriseSearch.notFound.action2', {
                    defaultMessage: 'Contact support',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiPageContent>
    </>
  );
};
