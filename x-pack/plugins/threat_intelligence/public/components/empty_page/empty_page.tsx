/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';

import { EuiEmptyPrompt, EuiImage, EuiButton, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import illustration from './integrations--light.svg';

export const displayName = 'EmptyPage';
export const TEST_ID_EMPTY_PAGE = 'tiEmptyPage';
export const TEST_ID_EMPTY_PAGE_DOCS_LINK = 'tiEmptyPageDocsLink';

interface EmptyPageProps {
  integrationsPageLink: string;
}

export const EmptyPage: VFC<EmptyPageProps> = ({ integrationsPageLink }) => {
  const docsLink =
    'https://www.elastic.co/guide/en/security/current/es-threat-intel-integrations.html';

  return (
    <EuiEmptyPrompt
      icon={
        <EuiImage
          size="fullWidth"
          alt={i18n.translate('xpack.threatIntelligence.common.emptyPage.imgAlt', {
            defaultMessage: 'Enable Threat Intelligence Integrations',
          })}
          src={illustration}
        />
      }
      title={
        <h3>
          <FormattedMessage
            id="xpack.threatIntelligence.common.emptyPage.title"
            defaultMessage="Get started with Elastic Threat Intelligence"
          />
        </h3>
      }
      titleSize="s"
      layout="horizontal"
      color="transparent"
      body={
        <>
          <p>
            <FormattedMessage
              id="xpack.threatIntelligence.common.emptyPage.body1"
              defaultMessage="Elastic Threat Intelligence makes it easy to analyze and investigate potential security
            threats by aggregating data from multiple sources in one place."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.threatIntelligence.common.emptyPage.body2"
              defaultMessage="You’ll be able to view data from all activated threat intelligence feeds and take action
            from this page."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.threatIntelligence.common.emptyPage.body3"
              defaultMessage="To get started with Elastic Threat Intelligence, enable one or more Threat Intelligence
            Integrations from the Integrations page or ingest data using filebeat. For more
            information, view the {docsLink}."
              values={{
                docsLink: (
                  <EuiLink
                    href={docsLink}
                    target="_blank"
                    data-test-subj={TEST_ID_EMPTY_PAGE_DOCS_LINK}
                  >
                    <FormattedMessage
                      id="xpack.threatIntelligence.common.emptyPage.docsLinkText"
                      defaultMessage="Security app documentation"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </>
      }
      actions={
        <EuiButton
          data-test-subj={`${displayName}-integrations-page-link`}
          href={integrationsPageLink}
          color="primary"
          iconType="plusInCircle"
          fill
        >
          <FormattedMessage
            id="xpack.threatIntelligence.common.emptyPage.buttonText"
            defaultMessage="Add Integrations"
          />
        </EuiButton>
      }
      data-test-subj={TEST_ID_EMPTY_PAGE}
    />
  );
};

EmptyPage.displayName = displayName;
