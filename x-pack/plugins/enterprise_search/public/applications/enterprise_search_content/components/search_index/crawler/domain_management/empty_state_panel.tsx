/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPanel,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlerLogic } from '../crawler_logic';

import { AddDomainForm } from './add_domain/add_domain_form';
import { AddDomainFormErrors } from './add_domain/add_domain_form_errors';
import { AddDomainFormSubmitButton } from './add_domain/add_domain_form_submit_button';
import { AddDomainLogic } from './add_domain/add_domain_logic';

export const EmptyStatePanel: React.FC = () => {
  const { openFlyout } = useActions(AddDomainLogic);
  const { events } = useValues(CrawlerLogic);
  return (
    <EuiPanel hasBorder>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.enterpriseSearch.crawler.domainManagement.emptyState.title', {
            defaultMessage: 'Add a domain to your index',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.crawler.domainManagement.emptyState.description',
            {
              defaultMessage:
                'Configure the domains you’d like to crawl, and when ready trigger your first crawl.',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      {events.length > 0 ? (
        <>
          <EuiText color="subdued" size="s">
            <p>
              {i18n.translate('xpack.enterpriseSearch.crawler.domainManagement.emptyState', {
                defaultMessage:
                  'You don’t have any domains on this index. Add your first domain to start crawling and indexing documents.',
              })}
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-telemetry-id="entSearchContent-crawler-domainManagement-noDomains-addFirstDomain"
                onClick={openFlyout}
                fill
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.crawler.domainManagement.emptyState.addDomainButtonLabel',
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
      ) : (
        <>
          <AddDomainFormErrors />
          <AddDomainForm />
          <EuiSpacer />
          <AddDomainFormSubmitButton />
        </>
      )}
    </EuiPanel>
  );
};
