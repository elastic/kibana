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

import { SearchApplicationViewLogic } from '../search_application_view_logic';

import { GenerateSearchApplicationApiKeyModal } from './generate_api_key_modal/generate_search_application_api_key_modal';
import { SearchApplicationApiIntegrationStage } from './search_application_api_integration';
import { SearchApplicationApiLogic } from './search_application_api_logic';

export const elasticsearchUrl = (cloudContext: CloudDetails): string => {
  const defaultUrl = 'http://localhost:9200';
  const url = cloudContext.elasticsearchUrl || defaultUrl;
  return url;
};

export const SearchApplicationAPI = () => {
  const { searchApplicationName } = useValues(SearchApplicationViewLogic);
  const { isGenerateModalOpen } = useValues(SearchApplicationApiLogic);
  const { openGenerateModal, closeGenerateModal } = useActions(SearchApplicationApiLogic);
  const cloudContext = useCloudDetails();

  const steps = [
    {
      children: (
        <>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step1.setUpSearchtemplate.description"
                defaultMessage="Your search application uses a {searchTemplateDocLink} to control the types of queries it accepts. Run the following command to view your current search template:"
                values={{
                  searchTemplateDocLink: (
                    <EuiLink href={docLinks.searchTemplates}>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step1.setUpSearchtemplate.searchTemplateDocLink"
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
                id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step1.setUpSearchtemplate.warning"
                defaultMessage="We provide a basic, default search template to get started, but you'll probably want to update it for your use case. Use the examples in our {searchTemplateExampleDoc} for inspiration."
                values={{
                  searchTemplateExampleDoc: (
                    <EuiLink href={docLinks.searchApplicationsTemplates}>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step1.setUpSearchtemplate.warning.searchTemplateExampleDocLink"
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
        'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step1.setUpSearchtemplate.title',
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
                id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step2.apiKeyWarning"
                defaultMessage="This {apiKeyDocumentation} will only be able to access your Search endpoint."
                values={{
                  apiKeyDocumentation: (
                    <EuiLink href={docLinks.apiKeys}>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step2.apiKeyWarning.documentationLink"
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
                data-telemetry-id="entSearchApplications-searchApi-step2-createApiKeyButton"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step2.createAPIKeyButton',
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
                data-telemetry-id="entSearchApplications-searchApi-step2-viewKeysButton"
                onClick={() =>
                  KibanaLogic.values.navigateToUrl('/app/management/security/api_keys', {
                    shouldNotCreateHref: true,
                  })
                }
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step2.viewKeysButton',
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
        'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step2.title',
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
                'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step3.copyEndpointDescription',
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
        'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step3.title',
        {
          defaultMessage: 'Copy your Search endpoint',
        }
      ),
    },
    {
      children: <SearchApplicationApiIntegrationStage />,
      title: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.step4.title',
        {
          defaultMessage: 'Learn how to call your endpoint',
        }
      ),
    },
  ];

  return (
    <>
      {isGenerateModalOpen ? (
        <GenerateSearchApplicationApiKeyModal
          onClose={closeGenerateModal}
          searchApplicationName={searchApplicationName}
        />
      ) : null}
      <EuiCallOut
        iconType="iInCircle"
        title={
          <FormattedMessage
            id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.searchApiCallout.title"
            defaultMessage="What is Search API?"
          />
        }
      >
        <FormattedMessage
          id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.searchApiCallout.body"
          defaultMessage="The {searchApiDocumentation} allows you to create a secure, public-facing search endpoint for your search application. This endpoint only accepts queries that match the parameters defined in your {searchTemplateDocumenation}."
          values={{
            searchApiDocumentation: (
              <EuiLink
                data-test-subj="search-documentation-link"
                href={docLinks.searchApplicationsSearchApi}
                data-telemetry-id="entSearchApplications-searchApi-documentation-viewDocumentaion"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.searchApiCallout.body.searchApiDocLink',
                  {
                    defaultMessage: 'Search API',
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
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.searchApiCallout.body.searchTemplateDocLink',
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
          id="xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.searchApiCallout.searchApiLearnMore"
          defaultMessage="{searchApiDocumentation}"
          values={{
            searchApiDocumentation: (
              <EuiLink
                data-test-subj="search-documentation-link"
                href={docLinks.searchApplicationsSearchApi}
                target="_blank"
                data-telemetry-id="entSearchApplications-searchApi-learnMoreDocumentation-viewDocumentaion"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchApi.searchApiCallout.body.searchApiDocumentationLink',
                  {
                    defaultMessage: 'Learn more about the Search API',
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
