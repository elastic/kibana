/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPanel, EuiText, EuiSpacer, EuiLink, EuiHorizontalRule } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiLinkTo } from '../../../../shared/react_router_helpers';
import { API_KEY_LABEL } from '../../../constants';
import { API_KEYS_PATH } from '../../../routes';

import { ContentSource, CustomSource, SourceDataItem } from '../../../types';

import { SourceIdentifier } from './source_identifier';

interface Props {
  source: ContentSource | CustomSource;
  sourceData: SourceDataItem;
  small?: boolean;
  title?: React.ReactNode;
}
export const CustomSourceCredentials: React.FC<Props> = ({
  source,
  sourceData,
  small = false,
  title,
}) => {
  const { name, id } = source;
  const {
    configuration: { documentationUrl, githubRepository },
  } = sourceData;
  return (
    <EuiPanel paddingSize={small ? 'm' : 'l'} hasShadow={false} color="subdued">
      {title && (
        <>
          {title}
          <EuiSpacer size="s" />
        </>
      )}
      <EuiText size={small ? 's' : 'm'}>
        {githubRepository ? (
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
      <EuiHorizontalRule margin={small ? 's' : 'l'} />
      <SourceIdentifier id={id} />
    </EuiPanel>
  );
};
