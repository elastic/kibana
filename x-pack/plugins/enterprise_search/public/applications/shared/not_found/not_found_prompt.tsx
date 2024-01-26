/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { LICENSED_SUPPORT_URL } from '../../../../common/constants';
import { LicensingLogic } from '../licensing';
import { EuiButtonTo } from '../react_router_helpers';

interface Props {
  productSupportUrl: string;
  backToLink?: string;
  backToContent?: React.ReactNode;
}

export const NotFoundPrompt: React.FC<Props> = ({
  productSupportUrl,
  backToLink = '/',
  backToContent,
}) => {
  const { hasGoldLicense } = useValues(LicensingLogic);
  const supportUrl = hasGoldLicense ? LICENSED_SUPPORT_URL : productSupportUrl;

  return (
    <KibanaPageTemplate.EmptyPrompt
      iconType="logoEnterpriseSearch"
      title={
        <h1>
          {i18n.translate('xpack.enterpriseSearch.notFound.title', {
            defaultMessage: '404 error',
          })}
        </h1>
      }
      body={
        <p>
          {i18n.translate('xpack.enterpriseSearch.notFound.description', {
            defaultMessage: 'The page you’re looking for was not found.',
          })}
        </p>
      }
      actions={
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButtonTo to={backToLink} fill>
              {backToContent ??
                i18n.translate('xpack.enterpriseSearch.notFound.action1', {
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
  );
};
