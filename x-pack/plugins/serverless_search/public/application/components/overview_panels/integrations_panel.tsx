/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiThemeProvider,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { docLinks } from '../../../../common/doc_links';
import { LEARN_MORE_LABEL } from '../../../../common/i18n_string';
import { GithubLink } from '../shared/github_link';

export const IntegrationsPanel: React.FC = () => {
  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel paddingSize="xl">
        <EuiFlexGroup alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoLogstash" size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h3>
                {i18n.translate('xpack.serverlessSearch.ingestData.logstashTitle', {
                  defaultMessage: 'Logstash',
                })}
              </h3>
            </EuiTitle>

            <EuiSpacer size="xs" />
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.serverlessSearch.ingestData.logstashDescription', {
                  defaultMessage:
                    'Add data to your data stream or index to make it searchable. Choose an ingestion method that fits your application and workflow.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="flexStart">
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiLink href={docLinks.logStash} target="_blank">
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <GithubLink
                  href="https://github.com/elastic/logstash"
                  label={i18n.translate('xpack.serverlessSearch.ingestData.logstashLink', {
                    defaultMessage: 'Logstash',
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoBeats" size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h3>
                {i18n.translate('xpack.serverlessSearch.ingestData.beatsTitle', {
                  defaultMessage: 'Beats',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              {i18n.translate('xpack.serverlessSearch.ingestData.beatsDescription', {
                defaultMessage:
                  'Lightweight, single-purpose data shippers for Elasticsearch. Use Beats to send operational data from your servers.',
              })}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="flexStart">
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiLink href={docLinks.beats} target="_blank">
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <GithubLink
                  href="https://github.com/elastic/beats"
                  label={i18n.translate('xpack.serverlessSearch.ingestData.beatsLink', {
                    defaultMessage: 'beats',
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiFlexGroup alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoEnterpriseSearch" size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h3>
                {i18n.translate('xpack.serverlessSearch.ingestData.connectorsTitle', {
                  defaultMessage: 'Connector Client',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              {i18n.translate('xpack.serverlessSearch.ingestData.connectorsDescription', {
                defaultMessage:
                  'Specialized integrations for syncing data from third-party sources to Elasticsearch. Use Elastic Connectors to sync content from a range of databases and object stores.',
              })}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="flexStart">
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiLink href={docLinks.connectors} target="_blank">
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <GithubLink
                  href="https://github.com/elastic/connectors-python"
                  label={i18n.translate('xpack.serverlessSearch.ingestData.connectorsPythonLink', {
                    defaultMessage: 'connectors-python',
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiThemeProvider>
  );
};
