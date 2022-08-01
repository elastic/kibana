/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiTitle, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { docLinks } from '../doc_links';

export const ElasticsearchResources: React.FC = () => (
  <>
    <EuiTitle size="xs">
      <h4>
        {i18n.translate('xpack.enterpriseSearch.overview.elasticsearchResources.title', {
          defaultMessage: 'Resources',
        })}
      </h4>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiSpacer size="xs" />
    <EuiLink href={docLinks.elasticsearchGettingStarted} target="_blank">
      {i18n.translate('xpack.enterpriseSearch.overview.elasticsearchResources.gettingStarted', {
        defaultMessage: 'Getting started with Elasticsearch',
      })}
    </EuiLink>
    <EuiSpacer size="s" />
    <EuiSpacer size="xs" />
    <EuiLink href={docLinks.elasticsearchCreateIndex} target="_blank">
      {i18n.translate('xpack.enterpriseSearch.overview.elasticsearchResources.createIndex', {
        defaultMessage: 'Create a new index',
      })}
    </EuiLink>
    <EuiSpacer size="s" />
    <EuiSpacer size="xs" />
    <EuiLink href={docLinks.clientsGuide} target="_blank">
      {i18n.translate(
        'xpack.enterpriseSearch.overview.elasticsearchResources.elasticsearchClients',
        { defaultMessage: 'Setup a language client' }
      )}
    </EuiLink>
    <EuiSpacer size="s" />
    <EuiSpacer size="xs" />
    <EuiLink
      href="https://github.com/elastic/search-ui/tree/master/packages/search-ui-elasticsearch-connector"
      target="_blank"
    >
      {i18n.translate('xpack.enterpriseSearch.overview.elasticsearchResources.searchUi', {
        defaultMessage: 'Search UI for Elasticsearch',
      })}
    </EuiLink>
  </>
);
