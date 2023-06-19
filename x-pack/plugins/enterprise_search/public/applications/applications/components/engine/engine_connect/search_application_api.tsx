/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiSteps,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CloudDetails, useCloudDetails } from '../../../../shared/cloud_details/cloud_details';
import { docLinks } from '../../../../shared/doc_links';
import { KibanaLogic } from '../../../../shared/kibana';

import { EngineViewLogic } from '../engine_view_logic';

import { EngineApiIntegrationStage } from './engine_api_integration';
import { EngineApiLogic } from './engine_api_logic';
import { GenerateEngineApiKeyModal } from './generate_engine_api_key_modal/generate_engine_api_key_modal';

export const elasticsearchUrl = (cloudContext: CloudDetails): string => {
  const defaultUrl = 'http://localhost:9200';
  const url = cloudContext.elasticsearchUrl || defaultUrl;
  return url;
};

export const SearchApplicationAPI = () => {
  const { engineName: searchApplicationName } = useValues(EngineViewLogic);
  const { isGenerateModalOpen } = useValues(EngineApiLogic);
  const { openGenerateModal, closeGenerateModal } = useActions(EngineApiLogic);
  const cloudContext = useCloudDetails();

  const steps = [
    {
      children: (
        <>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step1.setUpSearchtemplate.description"
                defaultMessage="Your search application uses a {searchTemplateDocLink} to control the types of queries it accepts. Run the following command to view your current search template:"
                values={{
                  searchTemplateDocLink: (
                    <EuiLink href={docLinks.searchTemplates}>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step1.setUpSearchtemplate.searchTemplateDocLink"
                        defaultMessage="search template"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>

          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiCodeBlock language="markup" fontSize="m" paddingSize="m" isCopyable>
                {`GET _application/search_application/${searchApplicationName}/`}
              </EuiCodeBlock>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step1.setUpSearchtemplate.warning"
                defaultMessage="We provide a basic, default search template to get started, but you'll probably want to update it for your use case. Use the examples in our {searchTemplateExampleDoc} for inspiration."
                values={{
                  searchTemplateExampleDoc: (
                    <EuiLink href={docLinks.searchApplicationsTemplates}>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step1.setUpSearchtemplate.warning.searchTemplateExampleDocLink"
                        defaultMessage="documentation"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </>
      ),
      title: i18n.translate(
        'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step1.setUpSearchtemplate.title',
        {
          defaultMessage: 'Set up your search template',
        }
      ),
    },
    {
      children: (
        <>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step2.apiKeyWarning"
                defaultMessage="This {apiKeyDocumentation} will only be able to access your Safe Search endpoint."
                values={{
                  apiKeyDocumentation: (
                    <EuiLink href={docLinks.apiKeys}>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step2.apiKeyWarning.documentationLink"
                        defaultMessage="API key"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconSide="left"
                iconType="plusInCircleFilled"
                onClick={openGenerateModal}
                data-telemetry-id="entSearchApplications-safeSearchApi-step2-createApiKeyButton"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step2.createAPIKeyButton',
                  {
                    defaultMessage: 'Create API Key',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconSide="left"
                iconType="popout"
                data-telemetry-id="entSearchApplications-safeSearchApi-step2-viewKeysButton"
                onClick={() =>
                  KibanaLogic.values.navigateToUrl('/app/management/security/api_keys', {
                    shouldNotCreateHref: true,
                  })
                }
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step2.viewKeysButton',
                  {
                    defaultMessage: 'View Keys',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
      title: i18n.translate(
        'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step2.title',
        {
          defaultMessage: 'Generate and save API key',
        }
      ),
    },
    {
      children: (
        <>
          <EuiText>
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step3.copyEndpointDescription',
                {
                  defaultMessage: "Here's the URL for your endpoint:",
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiCodeBlock language="markup" fontSize="m" paddingSize="m" isCopyable>
                {`${elasticsearchUrl(
                  cloudContext
                )}/_application/search_application/${searchApplicationName}/_search`}
              </EuiCodeBlock>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
      title: i18n.translate(
        'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step3.title',
        {
          defaultMessage: 'Copy your Safe Search endpoint',
        }
      ),
    },
    {
      children: <EngineApiIntegrationStage />,
      title: i18n.translate(
        'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step4.title',
        {
          defaultMessage: 'Learn how to call your endpoint',
        }
      ),
    },
  ];

  return (
    <>
      {isGenerateModalOpen ? (
        <GenerateEngineApiKeyModal
          engineName={searchApplicationName}
          onClose={closeGenerateModal}
        />
      ) : null}
      <EuiCallOut
        iconType="iInCircle"
        title={
          <FormattedMessage
            id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.safeSearchCallout.title"
            defaultMessage="What is Safe Search API?"
          />
        }
      >
        <FormattedMessage
          id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.safeSearchCallout.body"
          defaultMessage="The {safeSearchDocumentation} allows you to create a secure, public-facing search endpoint for your search application. This endpoint only accepts queries that match the parameters defined in your {searchTemplateDocumenation}."
          values={{
            safeSearchDocumentation: (
              <EuiLink
                data-test-subj="safe-search-documentation-link"
                href="#" // replace with safe search api doc link
                data-telemetry-id="entSearchApplications-safeSearchApi-documentation-viewDocumentaion"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.safeSearchCallout.body.safeSearchDocLink',
                  {
                    defaultMessage: 'Safe Search API',
                  }
                )}
              </EuiLink>
            ),
            searchTemplateDocumenation: (
              <EuiLink
                data-test-subj="search-template-documentation-link"
                href={docLinks.searchTemplates}
                data-telemetry-id="entSearchApplications-searchTemplate-documentation-viewDocumentaion"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.safeSearchCallout.body.searchTemplateDocLink',
                  {
                    defaultMessage: 'search template',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer size="l" />
        <FormattedMessage
          id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.safeSearchCallout.safeSearchLearnMore"
          defaultMessage="{safeSearchDocumentation}"
          values={{
            safeSearchDocumentation: (
              <EuiLink
                data-test-subj="safe-search-documentation-link"
                href="#" // replace with safe search api doc link
                target="_blank"
                data-telemetry-id="entSearchApplications-safeSearchApi-learnMoreDocumentation-viewDocumentaion"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.safeSearchCallout.body.safeSearchDocumentationLink',
                  {
                    defaultMessage: 'Learn more about the Safe Search API',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer />
      <EuiSteps headingElement="h2" steps={steps} />
    </>
  );
};
