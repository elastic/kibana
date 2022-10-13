/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CrawlerSingleDomainLogic } from '../crawler_single_domain_logic';
import { getDeleteDomainConfirmationMessage } from '../utils';

export const DeleteDomainPanel: React.FC = ({}) => {
  const { domain } = useValues(CrawlerSingleDomainLogic);
  const { deleteDomain } = useActions(CrawlerSingleDomainLogic);

  if (!domain) {
    return null;
  }

  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.deleteDomainPanel.title', {
            defaultMessage: 'Delete domain',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.crawler.deleteDomainPanel.description"
            defaultMessage="Remove this domain from your crawler. This will also delete all entry points and crawl
                    rules you have setup. {cannotUndoMessage}."
            values={{
              cannotUndoMessage: (
                <strong>
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.deleteDomainPanel.cannotUndoMessage',
                    {
                      defaultMessage: 'This cannot be undone',
                    }
                  )}
                </strong>
              ),
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton
        color="danger"
        iconType="trash"
        onClick={() => {
          if (confirm(getDeleteDomainConfirmationMessage(domain.url))) {
            deleteDomain(domain);
          }
        }}
      >
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawler.deleteDomainPanel.deleteDomainButtonLabel',
          {
            defaultMessage: 'Delete domain',
          }
        )}
      </EuiButton>
    </>
  );
};
