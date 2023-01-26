/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';

import { EuiButton, EuiEmptyPrompt, EuiImage, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIntegrationsPageLink, useTIDocumentationLink } from '../../hooks';
import illustration from './integrations_light.svg';
import { SecuritySolutionPluginTemplateWrapper } from '../../containers/security_solution_plugin_template_wrapper';

export const DOCS_LINK_TEST_ID = 'tiEmptyPageDocsLink';
export const EMPTY_PROMPT_TEST_ID = 'tiEmptyPage';
export const INTEGRATION_LINK_ID = 'tiEmptyPageIntegrationsPageLink';

export const EmptyPage: VFC = () => {
  const integrationsPageLink = useIntegrationsPageLink();
  const documentationLink = useTIDocumentationLink();

  return (
    <SecuritySolutionPluginTemplateWrapper isEmptyState>
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
                      href={documentationLink}
                      target="_blank"
                      data-test-subj={DOCS_LINK_TEST_ID}
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
            data-test-subj={INTEGRATION_LINK_ID}
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
        data-test-subj={EMPTY_PROMPT_TEST_ID}
      />
    </SecuritySolutionPluginTemplateWrapper>
  );
};
