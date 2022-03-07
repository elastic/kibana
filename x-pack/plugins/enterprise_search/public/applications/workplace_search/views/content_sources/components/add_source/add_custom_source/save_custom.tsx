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
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
  EuiTitle,
  EuiLink,
  EuiPanel,
  EuiCode,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../../shared/doc_links';
import { LicensingLogic } from '../../../../../../shared/licensing';
import { EuiButtonTo, EuiLinkTo } from '../../../../../../shared/react_router_helpers';
import { AppLogic } from '../../../../../app_logic';
import { LicenseBadge } from '../../../../../components/shared/license_badge';
import { API_KEY_LABEL } from '../../../../../constants';
import {
  SOURCES_PATH,
  SOURCE_DISPLAY_SETTINGS_PATH,
  getContentSourcePath,
  getSourcesPath,
  API_KEYS_PATH,
} from '../../../../../routes';
import { LEARN_CUSTOM_FEATURES_BUTTON } from '../../../constants';

import { SourceIdentifier } from '../../source_identifier';

import { AddSourceHeader } from '../add_source_header';
import {
  SAVE_CUSTOM_BODY1 as READY_TO_ACCEPT_REQUESTS_LABEL,
  SAVE_CUSTOM_BODY2 as COPY_SOURCE_IDENTIFIER_INSTRUCTIONS,
  SAVE_CUSTOM_RETURN_BUTTON,
  SAVE_CUSTOM_VISUAL_WALKTHROUGH_TITLE,
  SAVE_CUSTOM_VISUAL_WALKTHROUGH_LINK,
  SAVE_CUSTOM_STYLING_RESULTS_TITLE,
  SAVE_CUSTOM_STYLING_RESULTS_LINK,
  SAVE_CUSTOM_DOC_PERMISSIONS_TITLE,
  SAVE_CUSTOM_DOC_PERMISSIONS_LINK,
} from '../constants';

import { AddCustomSourceLogic } from './add_custom_source_logic';

export const SaveCustom: React.FC = () => {
  const { newCustomSource, sourceData } = useValues(AddCustomSourceLogic);
  const { isOrganization } = useValues(AppLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
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
      <EuiPanel paddingSize="l" hasShadow={false} color="subdued">
        <EuiFlexGroup direction="column" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiIcon type="checkInCircleFilled" color="#42CC89" size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="l">
              <EuiTextAlign textAlign="center">
                <h1>
                  {i18n.translate(
                    'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.heading',
                    {
                      defaultMessage: '{name} Created',
                      values: { name: newCustomSource.name },
                    }
                  )}
                </h1>
              </EuiTextAlign>
            </EuiTitle>
            <EuiText grow={false}>
              <EuiTextAlign textAlign="center">{READY_TO_ACCEPT_REQUESTS_LABEL}</EuiTextAlign>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule />
        <EuiSpacer size="s" />
        <EuiText>
          {serviceType !== 'custom' && githubRepository ? (
            <>
              <FormattedMessage
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
                id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.copySourceIdentifierInstructions"
                defaultMessage="Specify the following source identifier and appropriate API key in the cloned connector config file."
              />
              <EuiSpacer size="s" />
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.deploymentInstructions"
                defaultMessage="Review the {documentationLink} and deploy the connector package to be self managed on the infrastructure of your choice."
                values={{
                  documentationLink: (
                    <EuiLink target="_blank" href={documentationUrl}>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.documentationLinkLabel"
                        defaultMessage="deployment guide"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </>
          ) : (
            <FormattedMessage
              id="xpack.enterpriseSearch.workplaceSearch.sources.identifier.helpText"
              defaultMessage="Use the Source Identifier below with an {apiKeyLink} to sync documents for this custom source."
              values={{
                apiKeyLink: (
                  <EuiLinkTo target="_blank" to={API_KEYS_PATH}>
                    {API_KEY_LABEL}
                  </EuiLinkTo>
                ),
              }}
            />
          )}
        </EuiText>
        <EuiSpacer size="s" />
        <SourceIdentifier id={newCustomSource.id} />
        <EuiSpacer size="m" />
        <EuiTextAlign textAlign="center">
          <EuiButtonTo
            size="m"
            color="primary"
            fill
            to={getSourcesPath(SOURCES_PATH, isOrganization)}
          >
            {SAVE_CUSTOM_RETURN_BUTTON}
          </EuiButtonTo>
        </EuiTextAlign>
      </EuiPanel>
    </>
  );
};
