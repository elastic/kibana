/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
  EuiTitle,
  EuiLink,
  EuiPanel,
  EuiHorizontalRule,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButtonTo, EuiLinkTo } from '../../../../../../shared/react_router_helpers';
import { AppLogic } from '../../../../../app_logic';
import { API_KEY_LABEL } from '../../../../../constants';
import { SOURCES_PATH, getSourcesPath, API_KEYS_PATH } from '../../../../../routes';

import { SourceIdentifier } from '../../source_identifier';

import { AddSourceHeader } from '../add_source_header';
import { SAVE_CUSTOM_BODY1 as READY_TO_ACCEPT_REQUESTS_LABEL } from '../constants';

import { AddCustomSourceLogic } from './add_custom_source_logic';

export const SaveCustom: React.FC = () => {
  const { newCustomSource, sourceData } = useValues(AddCustomSourceLogic);
  const { isOrganization } = useValues(AppLogic);
  const {
    serviceType,
    configuration: { githubRepository, documentationUrl },
    name,
    categories = [],
  } = sourceData;

  return (
    <>
      <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel paddingSize="l" hasShadow={false} color="subdued">
            <EuiFlexGroup
              direction="column"
              alignItems="center"
              style={{ marginTop: 'auto', marginBottom: 'auto' }}
            >
              <EuiFlexItem>
                <EuiIcon type="checkInCircleFilled" color="#42CC89" size="xxl" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="l">
                  <EuiTextAlign textAlign="center">
                    <h2>
                      {i18n.translate(
                        'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.heading',
                        {
                          defaultMessage: '{name} Created',
                          values: { name: newCustomSource.name },
                        }
                      )}
                    </h2>
                  </EuiTextAlign>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText grow={false}>
                  <EuiTextAlign textAlign="center">{READY_TO_ACCEPT_REQUESTS_LABEL}</EuiTextAlign>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonTo
                  size="m"
                  color="primary"
                  fill
                  to={getSourcesPath(SOURCES_PATH, isOrganization)}
                >
                  <FormattedMessage
                    id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.configureNewSourceButtonLabel"
                    defaultMessage="Configure a new content source"
                  />
                </EuiButtonTo>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="l" hasShadow={false} color="subdued">
            <EuiText>
              {serviceType !== 'custom' && githubRepository ? (
                <>
                  <FormattedMessage
                    data-test-subj="GithubRepositoryLink"
                    id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.repositoryInstructions"
                    defaultMessage="Set up your connector by cloning the {githubRepositoryLink}"
                    values={{
                      githubRepositoryLink: (
                        <EuiLink target="_blank" href={`https://github.com/${githubRepository}`}>
                          <FormattedMessage
                            id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.repositoryLinkLabel"
                            defaultMessage="{name} connector repository"
                            values={{ name }}
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                  <EuiSpacer size="s" />
                  <FormattedMessage
                    data-test-subj="PreconfiguredDocumentationLink"
                    id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.deploymentInstructions"
                    defaultMessage="Review the {documentationLink} and deploy the connector package to be self managed on the infrastructure of your choice."
                    values={{
                      documentationLink: (
                        <EuiLink target="_blank" href={documentationUrl}>
                          <FormattedMessage
                            id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.documentationLinkLabel"
                            defaultMessage="{name} connector documentation"
                            values={{ name }}
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </>
              ) : (
                <FormattedMessage
                  data-test-subj="GenericDocumentationLink"
                  id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.documentationHelpText"
                  defaultMessage="Review the {documentationLink} to learn how to build and deploy your own connector on the self managed infrastructure of your choice."
                  values={{
                    documentationLink: (
                      <EuiLink target="_blank" href={documentationUrl}>
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.customAPISourceDocumentationLabel"
                          defaultMessage="Custom API source documentation"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              )}
              <EuiSpacer size="s" />
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.sources.saveCustom.sourceIdentifierHelpText"
                defaultMessage="Specify the following Source Identifier along with an {apiKeyLink} in the deployed connector's config file to sync documents."
                values={{
                  apiKeyLink: (
                    <EuiLinkTo target="_blank" to={API_KEYS_PATH}>
                      {API_KEY_LABEL}
                    </EuiLinkTo>
                  ),
                }}
              />
            </EuiText>
            <EuiHorizontalRule />
            <SourceIdentifier id={newCustomSource.id} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      {serviceType !== 'custom' && (
        <>
          <EuiSpacer />
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiCallOut
                data-test-subj="FeedbackCallout"
                heading="h3"
                size="s"
                title={
                  <EuiLinkTo target="_blank" to={'https://www.elastic.co/kibana/feedback'}>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.workplaceSearch.sources.feedbackLinkLabel"
                      defaultMessage="Have feedback about deploying a {name} connector? Let us know."
                      values={{ name }}
                    />
                  </EuiLinkTo>
                }
                iconType="email"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
