/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiIcon,
  EuiImage,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  convertCloudUrlToProxyConnection,
  validateCloudUrl,
} from '../../../services/cloud_deployment_url';

// @ts-ignore
import Screenshot from './cloud_deployment_screenshot.png';

interface Props {
  onClose: () => void;
  onClusterConfigure: (value: { proxyAddress: string; serverName: string }) => void;
}

// TODO copy review
export const CloudDeploymentForm: FunctionComponent<Props> = ({ onClose, onClusterConfigure }) => {
  const [cloudDeploymentUrl, setCloudDeploymentUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const configureCluster = () => {
    const urlError: string | null = validateCloudUrl(cloudDeploymentUrl);
    if (urlError) {
      setError(urlError);
    } else {
      onClose();
      onClusterConfigure(convertCloudUrlToProxyConnection(cloudDeploymentUrl));
    }
  };
  return (
    <EuiFlyout onClose={() => onClose()}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="logoCloud" size="l" />
              </EuiFlexItem>

              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.remoteClusters.cloudDeploymentForm.formTitle"
                  defaultMessage=" Add Cloud deployment as remote cluster"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.remoteClusters.cloudDeploymentForm.formDescription"
              defaultMessage="If you're connecting to a Cloud deployment, you can copy and paste the Elasticsearch
              endpoint URL into the field below. The remote cluster will be automatically configured to connect to the Cloud deployment."
            />
          </p>
        </EuiText>

        <EuiSpacer />

        <EuiAccordion
          id="cloudDeploymentScreenshot"
          buttonContent={i18n.translate(
            'xpack.remoteClusters.cloudDeploymentForm.screenshotButtonLabel',
            { defaultMessage: 'Expand for a screenshot' }
          )}
        >
          <EuiImage url={Screenshot} alt="Screenshot of Cloud deployment url link" />
        </EuiAccordion>

        <EuiSpacer />

        <EuiFormRow
          fullWidth={true}
          isInvalid={!!error}
          error={error}
          label={
            <FormattedMessage
              id="xpack.remoteClusters.cloudDeploymentForm.inputLabel"
              defaultMessage="Elasticsearch endpoint URL"
            />
          }
        >
          <EuiFieldText
            isInvalid={!!error}
            fullWidth={true}
            value={cloudDeploymentUrl}
            onChange={(e) => setCloudDeploymentUrl(e.target.value)}
          />
        </EuiFormRow>

        <EuiSpacer />

        <EuiText color="subdued">
          <p>
            <i>
              <strong>
                <FormattedMessage
                  id="xpack.remoteClusters.cloudDeploymentForm.aliasNoteLabel"
                  defaultMessage="Note: "
                />
              </strong>
              <FormattedMessage
                id="xpack.remoteClusters.cloudDeploymentForm.aliasNoteDescription"
                defaultMessage="If you configured a deployment alias in Elastic Cloud,
              in your own load balancer or reverse proxy, you will need to copy the deployment
              proxy address and server name from the Remote cluster parameters section in
              the Security page and paste them in the form directly. "
              />
              <EuiLink href="test.com" target="_blank" external={true}>
                <FormattedMessage
                  id="xpack.remoteClusters.cloudDeploymentForm.aliasDocsLink"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            </i>
          </p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" flush="left" onClick={onClose}>
              <FormattedMessage
                id="xpack.remoteClusters.cloudDeploymentForm.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill color="primary" onClick={configureCluster}>
              <FormattedMessage
                id="xpack.remoteClusters.cloudDeploymentForm.configureClusterButtonLabel"
                defaultMessage="Configure cluster"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
