/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { PLUGIN_ID } from '../../../../common';

import { useKibanaServices } from '../../hooks/use_kibana';
import { LanguageDefinition } from '../languages/types';
import { OverviewPanel } from './overview_panel';
import { docLinks } from '../../../../common/doc_links';
interface SelectClientProps {
  setSelectedLanguage: (language: LanguageDefinition) => void;
  languages: LanguageDefinition[];
  selectedLanguage: LanguageDefinition;
}
export const SelectClientPanel: React.FC<SelectClientProps> = ({
  setSelectedLanguage,
  languages,
  selectedLanguage,
}) => {
  const { http } = useKibanaServices();
  const { euiTheme } = useEuiTheme();

  const panelItems = languages.map((language) => (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiPanel
          hasBorder
          borderRadius="m"
          onClick={() => setSelectedLanguage(language)}
          grow={false}
          paddingSize="m"
          css={
            selectedLanguage === language
              ? css`
                  border: 1px solid ${euiTheme.colors.primary};
                `
              : css`
                  border: 1px solid ${euiTheme.colors.lightShade};
                `
          }
          color={selectedLanguage === language ? 'primary' : 'plain'}
        >
          <EuiFlexGroup direction="column" gutterSize="l" justifyContent="center">
            <EuiFlexItem>
              <EuiImage
                alt=""
                src={http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/${language.iconType}`)}
                height="32px"
                width="32px"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText
                textAlign="center"
                color={selectedLanguage === language ? 'default' : 'subdued'}
              >
                <h5>
                  {i18n.translate('xpack.serverlessSearch.selectClient.language.name', {
                    defaultMessage: language.name,
                  })}
                </h5>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  ));

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
          <EuiFlexGroup gutterSize="l" direction="column">
            <EuiFlexItem>
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.serverlessSearch.selectClient.heading', {
                    defaultMessage: 'Choose one',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGrid
                gutterSize="l"
                direction="row"
                columns={panelItems.length > 3 ? 4 : 3}
                alignItems="center"
              >
                {panelItems.map((panelItem, index) => (
                  <EuiFlexItem key={`panelItem.${index}`}>
                    <EuiFlexGrid direction="column" gutterSize="s">
                      <EuiFlexItem>{panelItem}</EuiFlexItem>
                    </EuiFlexGrid>
                  </EuiFlexItem>
                ))}
              </EuiFlexGrid>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiCallOut title="Try it now in Console" size="m" iconType="iInCircle">
                <p>
                  {i18n.translate('xpack.serverlessSearch.selectClient.callout.description', {
                    defaultMessage:
                      'With Console, you can get started right away with our REST API’s. No installation required. ',
                  })}

                  <span>
                    <EuiLink
                      target="_blank"
                      href={http.basePath.prepend(`/app/dev_tools#/console`)}
                    >
                      {i18n.translate('xpack.serverlessSearch.selectClient.callout.link', {
                        defaultMessage: 'Try Console now',
                      })}
                    </EuiLink>
                  </span>
                </p>
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
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
