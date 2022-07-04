/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import {
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AddDomainLogic } from './add_domain/add_domain_logic';

export const EmptyStatePanel: React.FC = () => {
  const { openFlyout } = useActions(AddDomainLogic);

  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.domainsTitle', {
            defaultMessage: 'Add a domain to your index',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="s">
        <p>
          {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.crawlRequestsDescription', {
            defaultMessage:
              'You don’t have any domains on this index. Add your first domain to start crawling and indexing documents.',
          })}
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton onClick={openFlyout} fill>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.addDomainFlyout.openButtonLabel',
              {
                defaultMessage: 'Add your first domain',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink target="_blank">Learn more</EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
