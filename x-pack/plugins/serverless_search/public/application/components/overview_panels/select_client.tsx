/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { useKibanaServices } from '../../hooks/use_kibana';
import { OverviewPanel } from './overview_panel';
import { docLinks } from '../../../../common/doc_links';
import './select_client.scss';

export const SelectClientPanel: React.FC = ({ children }) => {
  const { http } = useKibanaServices();

  return (
    <OverviewPanel
      description={
        <FormattedMessage
          id="xpack.serverlessSearch.selectClient.description"
          defaultMessage="Elastic builds and maintains clients in several popular languages and our community has contributed many more. Select your favorite language client or dive into the {console} to get started."
          values={{
            console: (
              <EuiLink href={http.basePath.prepend(`/app/dev_tools#/console`)}>
                {i18n.translate('xpack.serverlessSearch.selectClient.description.console.link', {
                  defaultMessage: 'Console',
                })}
              </EuiLink>
            ),
          }}
        />
      }
      leftPanelContent={
        <>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.serverlessSearch.selectClient.heading', {
                    defaultMessage: 'Choose one',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" direction="row">
            {children}
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiCallOut
            title={i18n.translate('xpack.serverlessSearch.selectClient.callout.title', {
              defaultMessage: 'Try it now in Console',
            })}
            size="m"
            iconType="iInCircle"
          >
            <p>
              {i18n.translate('xpack.serverlessSearch.selectClient.callout.description', {
                defaultMessage:
                  'With Console, you can get started right away with our REST API’s. No installation required. ',
              })}

              <span>
                <EuiLink target="_blank" href={http.basePath.prepend(`/app/dev_tools#/console`)}>
                  {i18n.translate('xpack.serverlessSearch.selectClient.callout.link', {
                    defaultMessage: 'Try Console now',
                  })}
                </EuiLink>
              </span>
            </p>
          </EuiCallOut>
        </>
      }
      links={[
        {
          href: docLinks.elasticsearchClients,
          label: i18n.translate('xpack.serverlessSearch.selectClient.elasticsearchClientDocLink', {
            defaultMessage: 'Elasticsearch clients ',
          }),
        },
        {
          href: docLinks.kibanaRunApiInConsole,
          label: i18n.translate('xpack.serverlessSearch.selectClient.apiRequestConsoleDocLink', {
            defaultMessage: 'Run API requests in Console ',
          }),
        },
      ]}
      title={i18n.translate('xpack.serverlessSearch.selectClient.title', {
        defaultMessage: 'Select your client',
      })}
    />
  );
};
