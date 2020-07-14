/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPageBody,
  EuiPageContent,
  EuiForm,
  EuiText,
  EuiButton,
  EuiTitle,
  EuiSpacer,
  EuiIcon,
  EuiCallOut,
  EuiFlexItem,
  EuiFlexGroup,
  EuiCode,
  EuiCodeBlock,
  EuiLink,
} from '@elastic/eui';
import { useCore, sendPostFleetSetup } from '../../../hooks';
import { WithoutHeaderLayout } from '../../../layouts';
import { GetFleetStatusResponse } from '../../../types';

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

export const SetupPage: React.FunctionComponent<{
  refresh: () => Promise<void>;
  missingRequirements: GetFleetStatusResponse['missing_requirements'];
}> = ({ refresh, missingRequirements }) => {
  const [isFormLoading, setIsFormLoading] = useState<boolean>(false);
  const core = useCore();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsFormLoading(true);
    try {
      await sendPostFleetSetup({ forceRecreate: true });
      await refresh();
    } catch (error) {
      core.notifications.toasts.addDanger(error.message);
      setIsFormLoading(false);
    }
  };

  if (
    !missingRequirements.includes('tls_required') &&
    !missingRequirements.includes('api_keys') &&
    !missingRequirements.includes('encrypted_saved_object_encryption_key_required')
  ) {
    return (
      <WithoutHeaderLayout>
        <EuiPageBody restrictWidth={548}>
          <EuiPageContent
            verticalPosition="center"
            horizontalPosition="center"
            className="eui-textCenter"
            paddingSize="l"
          >
            <EuiSpacer size="m" />
            <EuiIcon type="lock" color="subdued" size="xl" />
            <EuiSpacer size="m" />
            <EuiTitle size="l">
              <h2>
                <FormattedMessage
                  id="xpack.ingestManager.setupPage.enableTitle"
                  defaultMessage="Enable Fleet"
                />
              </h2>
            </EuiTitle>
            <EuiSpacer size="xl" />
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.ingestManager.setupPage.enableText"
                defaultMessage="In order to use Fleet, you must create an Elastic user. This user can create API keys
        and write to logs-* and metrics-*."
              />
            </EuiText>
            <EuiSpacer size="l" />
            <EuiForm>
              <form onSubmit={onSubmit}>
                <EuiButton fill isLoading={isFormLoading} type="submit">
                  <FormattedMessage
                    id="xpack.ingestManager.setupPage.enableFleet"
                    defaultMessage="Create user and enable Fleet"
                  />
                </EuiButton>
              </form>
            </EuiForm>
            <EuiSpacer size="m" />
          </EuiPageContent>
        </EuiPageBody>
      </WithoutHeaderLayout>
    );
  }

  return (
    <WithoutHeaderLayout>
      <EuiPageBody restrictWidth={820}>
        <EuiPageContent>
          <EuiCallOut
            title={i18n.translate('xpack.ingestManager.setupPage.missingRequirementsCalloutTitle', {
              defaultMessage: 'Missing security requirements',
            })}
            color="warning"
            iconType="alert"
          >
            <FormattedMessage
              id="xpack.ingestManager.setupPage.missingRequirementsCalloutDescription"
              defaultMessage="In order to use Fleet, you must enable the following Elasticsearch and Kibana security features."
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
          <FormattedMessage
            id="xpack.ingestManager.setupPage.missingRequirementsElasticsearchTitle"
            defaultMessage="In your Elasticsearch configuration, enable:"
          />
          <EuiSpacer size="l" />
          <RequirementItem isMissing={false}>
            <FormattedMessage
              id="xpack.ingestManager.setupPage.elasticsearchSecurityFlagText"
              defaultMessage="Elasticsearch security. Set {securityFlag} to {true} ."
              values={{
                securityFlag: <EuiCode>xpack.security.enabled</EuiCode>,
                true: <EuiCode>true</EuiCode>,
              }}
            />
          </RequirementItem>
          <EuiSpacer size="s" />
          <RequirementItem isMissing={missingRequirements.includes('api_keys')}>
            <FormattedMessage
              id="xpack.ingestManager.setupPage.elasticsearchApiKeyFlagText"
              defaultMessage="API key service. Set {apiKeyFlag} to {true} ."
              values={{
                apiKeyFlag: <EuiCode>xpack.security.authc.api_key.enabled</EuiCode>,
                true: <EuiCode>true</EuiCode>,
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
            id="xpack.ingestManager.setupPage.missingRequirementsKibanaTitle"
            defaultMessage="In your Kibana configuration, enable:"
          />
          <EuiSpacer size="l" />
          <RequirementItem isMissing={missingRequirements.includes('tls_required')}>
            <FormattedMessage
              id="xpack.ingestManager.setupPage.tlsFlagText"
              defaultMessage="Kibana security. Set. Set {securityFlag} to {true}. For development purposes, you can disable TLS by setting {tlsFlag} to {true} as an unsafe alternative."
              values={{
                securityFlag: <EuiCode>xpack.security.enabled</EuiCode>,
                tlsFlag: <EuiCode>xpack.ingestManager.fleet.tlsCheckDisabled</EuiCode>,
                true: <EuiCode>true</EuiCode>,
              }}
            />
          </RequirementItem>
          <EuiSpacer size="m" />
          <RequirementItem
            isMissing={missingRequirements.includes(
              'encrypted_saved_object_encryption_key_required'
            )}
          >
            <FormattedMessage
              id="xpack.ingestManager.setupPage.encryptionKeyFlagText"
              defaultMessage="Encryption key. Set {keyFlag} to use a secret key."
              values={{
                keyFlag: <EuiCode>xpack.reporting.encryptionKey</EuiCode>,
              }}
            />
          </RequirementItem>
          <EuiSpacer size="l" />
          <FormattedMessage
            id="xpack.ingestManager.setupPage.gettingStartedText"
            defaultMessage="For more information, read our {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/ingest-management/current/index.html"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.ingestManager.setupPage.gettingStartedLink"
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
