/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AuthenticatedUser } from '@kbn/security-plugin/public';

export interface WelcomeBannerProps {
  image: string;
  user?: AuthenticatedUser;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ user, image }) => (
  <>
    <EuiSpacer size="xxl" />
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={2}>
        {/* Reversing column direction here so screenreaders keep h1 as the first element */}
        <EuiFlexGroup justifyContent="flexStart" direction="columnReverse" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="xpack.enterpriseSearch.welcomeBanner.header.title"
                  defaultMessage="Add data to Elasticsearch and then search, vectorize, or visualize"
                />
              </h1>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText color="subdued">
              {i18n.translate('xpack.enterpriseSearch.welcomeBanner.header.titleDescription', {
                defaultMessage:
                  'There are endless ways to ingest and explore data with Elasticsearch, connect to your Elasticsearch instance and start indexing data',
              })}
            </EuiText>
          </EuiFlexItem>
          {Boolean(user) && (
            <EuiFlexItem grow={false}>
              <EuiText color="subdued">
                <h4>
                  {user
                    ? i18n.translate(
                        'xpack.enterpriseSearch.welcomeBanner.header.greeting.customTitle',
                        {
                          defaultMessage: '👋 Hi {name}!',
                          values: { name: user.full_name || user.username },
                        }
                      )
                    : i18n.translate(
                        'xpack.enterpriseSearch.welcomeBanner.header.greeting.defaultTitle',
                        {
                          defaultMessage: '👋 Hi',
                        }
                      )}
                </h4>
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <EuiImage alt="" src={image} size="original" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
