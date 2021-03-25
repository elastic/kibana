/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiImage,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useAppContext } from '../../../../app_context';
import { proxySettingsUrl } from '../../../../services/documentation';
import { Props } from './connection_mode';

export const ProxyConnection: FunctionComponent<Props> = (props) => {
  const { fields, fieldsErrors, areErrorsVisible, onFieldsChange } = props;
  const { isCloudEnabled, basePath } = useAppContext();
  const { proxyAddress, serverName, proxySocketConnections, cloudUrl, cloudUrlEnabled } = fields;
  const {
    proxyAddress: proxyAddressError,
    serverName: serverNameError,
    cloudUrl: cloudUrlError,
  } = fieldsErrors;

  return (
    <div data-test-subj="proxyConnectionDiv">
      {cloudUrlEnabled ? (
        <>
          <EuiFormRow
            data-test-subj="remoteClusterFormCloudUrlFormRow"
            label={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldCloudUrlLabel"
                defaultMessage="Elasticsearch endpoint url"
              />
            }
            isInvalid={Boolean(areErrorsVisible && cloudUrlError)}
            error={cloudUrlError}
            fullWidth
            helpText={
              <>
                <EuiSpacer size="s" />
                <EuiAccordion
                  id="cloudScreenshot"
                  buttonContent={
                    <EuiText size="xs">
                      <FormattedMessage
                        id="xpack.remoteClusters.remoteClusterForm.fieldCloudUrlHelpText"
                        defaultMessage="How to find your Elasticsearch endpoint URL?"
                      />
                    </EuiText>
                  }
                >
                  <EuiSpacer size="s" />
                  <EuiText size="xs">
                    <FormattedMessage
                      id="xpack.remoteClusters.remoteClusterForm.cloudScreenshotDescription"
                      defaultMessage="Copy the endpoint URL from the Cloud deployment overview page under Applications"
                    />
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiImage
                    url={basePath.prepend('/plugins/remoteClusters/assets/cloud_screenshot.png')}
                    alt={i18n.translate(
                      'xpack.remoteClusters.remoteClusterForm.cloudScreenshotAlt',
                      {
                        defaultMessage:
                          'A screenshot of Cloud deployment page section with a highlighted endpoint url.',
                      }
                    )}
                  />
                </EuiAccordion>
              </>
            }
          >
            <EuiFieldText
              value={cloudUrl}
              onChange={(e) => onFieldsChange({ cloudUrl: e.target.value })}
              isInvalid={Boolean(areErrorsVisible && cloudUrlError)}
              data-test-subj="remoteClusterFormCloudUrlInput"
              fullWidth
            />
          </EuiFormRow>
        </>
      ) : (
        <>
          <EuiFormRow
            data-test-subj="remoteClusterFormProxyAddressFormRow"
            label={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldProxyAddressLabel"
                defaultMessage="Proxy address"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldProxyAddressHelpText"
                defaultMessage="The address to use for remote connections."
              />
            }
            isInvalid={Boolean(areErrorsVisible && proxyAddressError)}
            error={proxyAddressError}
            fullWidth
          >
            <EuiFieldText
              value={proxyAddress}
              placeholder={i18n.translate(
                'xpack.remoteClusters.remoteClusterForm.fieldProxyAddressPlaceholder',
                {
                  defaultMessage: 'host:port',
                }
              )}
              onChange={(e) => onFieldsChange({ proxyAddress: e.target.value })}
              isInvalid={Boolean(areErrorsVisible && proxyAddressError)}
              data-test-subj="remoteClusterFormProxyAddressInput"
              fullWidth
            />
          </EuiFormRow>

          <EuiFormRow
            data-test-subj="remoteClusterFormServerNameFormRow"
            isInvalid={Boolean(areErrorsVisible && serverNameError)}
            error={serverNameError}
            label={
              isCloudEnabled ? (
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.fieldServerNameRequiredLabel"
                  defaultMessage="Server name"
                />
              ) : (
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.fieldServerNameOptionalLabel"
                  defaultMessage="Server name (optional)"
                />
              )
            }
            helpText={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldServerNameHelpText"
                defaultMessage="A string sent in the server_name field of the TLS Server Name Indication extension if TLS is enabled. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink href={proxySettingsUrl} target="_blank">
                      <FormattedMessage
                        id="xpack.remoteClusters.remoteClusterForm.fieldServerNameHelpText.learnMoreLinkLabel"
                        defaultMessage="Learn more."
                      />
                    </EuiLink>
                  ),
                }}
              />
            }
            fullWidth
          >
            <EuiFieldText
              value={serverName}
              onChange={(e) => onFieldsChange({ serverName: e.target.value })}
              isInvalid={Boolean(areErrorsVisible && serverNameError)}
              fullWidth
            />
          </EuiFormRow>
        </>
      )}
      <EuiFormRow
        data-test-subj="remoteClusterFormProxySocketConnectionsFormRow"
        label={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldProxySocketConnectionsLabel"
            defaultMessage="Socket connections"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldSocketConnectionsHelpText"
            defaultMessage="The number of socket connections to open per remote cluster."
          />
        }
        fullWidth
      >
        <EuiFieldNumber
          value={proxySocketConnections || ''}
          onChange={(e) => onFieldsChange({ proxySocketConnections: Number(e.target.value) })}
          fullWidth
        />
      </EuiFormRow>
    </div>
  );
};
