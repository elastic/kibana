/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPageBody,
  EuiPageContent,
  EuiText,
  EuiSpacer,
  EuiIcon,
  EuiCallOut,
  EuiFlexItem,
  EuiFlexGroup,
  EuiCode,
  EuiCodeBlock,
  EuiLink,
} from '@elastic/eui';

import { WithoutHeaderLayout } from '../../../layouts';
import type { GetFleetStatusResponse } from '../../../types';
import { useStartServices } from '../../../hooks';

export const RequirementItem: React.FunctionComponent<{ isMissing: boolean }> = ({
  isMissing,
  children,
}) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiText>
          {isMissing ? (
            <EuiIcon type="crossInACircleFilled" color="danger" />
          ) : (
            <EuiIcon type="checkInCircleFilled" color="success" />
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText>{children}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const MissingESRequirementsPage: React.FunctionComponent<{
  missingRequirements: GetFleetStatusResponse['missing_requirements'];
}> = ({ missingRequirements }) => {
  const { docLinks } = useStartServices();

  return (
    <WithoutHeaderLayout>
      <EuiPageBody restrictWidth={820}>
        <EuiPageContent hasBorder={true} hasShadow={false}>
          <EuiCallOut
            title={i18n.translate('xpack.fleet.setupPage.missingRequirementsCalloutTitle', {
              defaultMessage: 'Missing security requirements',
            })}
            color="warning"
            iconType="alert"
          >
            <FormattedMessage
              id="xpack.fleet.setupPage.missingRequirementsCalloutDescription"
              defaultMessage="To use central management for Elastic Agents, enable the following Elasticsearch security features."
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
          <FormattedMessage
            id="xpack.fleet.setupPage.missingRequirementsElasticsearchTitle"
            defaultMessage="In your Elasticsearch configuration ({esConfigFile}), enable:"
            values={{ esConfigFile: <EuiCode>elasticsearch.yml</EuiCode> }}
          />
          <EuiSpacer size="l" />
          <RequirementItem isMissing={missingRequirements.includes('security_required')}>
            <FormattedMessage
              id="xpack.fleet.setupPage.elasticsearchSecurityFlagText"
              defaultMessage="{esSecurityLink}. Set {securityFlag} to {true} ."
              values={{
                esSecurityLink: (
                  <EuiLink
                    href={docLinks.links.security.elasticsearchEnableSecurity}
                    target="_blank"
                    external
                  >
                    <FormattedMessage
                      id="xpack.fleet.setupPage.elasticsearchSecurityLink"
                      defaultMessage="Elasticsearch security"
                    />
                  </EuiLink>
                ),
                securityFlag: <EuiCode>xpack.security.enabled</EuiCode>,
                true: <EuiCode>true</EuiCode>,
              }}
            />
          </RequirementItem>
          <EuiSpacer size="s" />
          <RequirementItem isMissing={missingRequirements.includes('api_keys')}>
            <FormattedMessage
              id="xpack.fleet.setupPage.elasticsearchApiKeyFlagText"
              defaultMessage="{apiKeyLink}. Set {apiKeyFlag} to {true} ."
              values={{
                apiKeyFlag: <EuiCode>xpack.security.authc.api_key.enabled</EuiCode>,
                true: <EuiCode>true</EuiCode>,
                apiKeyLink: (
                  <EuiLink
                    href={docLinks.links.security.apiKeyServiceSettings}
                    target="_blank"
                    external
                  >
                    <FormattedMessage
                      id="xpack.fleet.setupPage.apiKeyServiceLink"
                      defaultMessage="API key service"
                    />
                  </EuiLink>
                ),
              }}
            />
          </RequirementItem>
          <EuiSpacer size="m" />
          <EuiCodeBlock isCopyable={true}>
            {`xpack.security.enabled: true
xpack.security.authc.api_key.enabled: true`}
          </EuiCodeBlock>
          <EuiSpacer size="l" />
          <FormattedMessage
            id="xpack.fleet.setupPage.gettingStartedText"
            defaultMessage="For more information, read our {link} guide."
            values={{
              link: (
                <EuiLink href={docLinks.links.fleet.guide} target="_blank" external>
                  <FormattedMessage
                    id="xpack.fleet.setupPage.gettingStartedLink"
                    defaultMessage="Getting Started"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiPageContent>
      </EuiPageBody>
    </WithoutHeaderLayout>
  );
};
