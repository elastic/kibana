/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCopy,
  EuiCodeBlock,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../hooks';

import { agentPolicyRouteService, API_VERSIONS } from '../../../common';

import { sendGetK8sManifest } from '../../hooks/use_request/k8s';

interface Props {
  enrollmentAPIKey?: string;
  onCopy?: () => void;
  onDownload?: () => void;
  fleetServerHost?: string;
}

export const getManifestDownloadLink = (fleetServerHost?: string, enrollmentAPIKey?: string) => {
  const searchParams = new URLSearchParams({
    apiVersion: API_VERSIONS.public.v1,
    ...(fleetServerHost && { fleetServer: fleetServerHost }),
    ...(enrollmentAPIKey && { enrolToken: enrollmentAPIKey }),
  });

  return `${agentPolicyRouteService.getK8sFullDownloadPath()}?${searchParams.toString()}`;
};

export const KubernetesInstructions: React.FunctionComponent<Props> = ({
  enrollmentAPIKey,
  onCopy,
  onDownload,
  fleetServerHost,
}) => {
  const core = useStartServices();
  const { notifications, docLinks } = core;

  const [yaml, setYaml] = useState<string>('');
  const [copyButtonClicked, setCopyButtonClicked] = useState(false);
  const [downloadButtonClicked, setDownloadButtonClicked] = useState(false);

  const onCopyButtonClick = (copy: () => void) => {
    copy();
    setCopyButtonClicked(true);
    if (onCopy) onCopy();
  };

  const onDownloadButtonClick = (downloadLink: string) => {
    setDownloadButtonClicked(true);
    if (onDownload) onDownload();
    window.location.href = downloadLink;
  };

  useEffect(() => {
    async function fetchK8sManifest() {
      try {
        const query = {
          enrolToken: enrollmentAPIKey,
          ...(fleetServerHost && { fleetServer: fleetServerHost }),
        };
        const res = await sendGetK8sManifest(query);
        if (res.error) {
          throw res.error;
        }

        if (!res.data) {
          throw new Error('No data while fetching agent manifest');
        }

        setYaml(res.data.item);
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.agentEnrollment.loadk8sManifestErrorTitle', {
            defaultMessage: 'Error while fetching agent manifest',
          }),
        });
      }
    }
    fetchK8sManifest();
  }, [notifications.toasts, enrollmentAPIKey, fleetServerHost]);

  const downloadDescription = (
    <FormattedMessage
      id="xpack.fleet.agentEnrollment.downloadDescriptionForK8s"
      defaultMessage="Copy or download the Kubernetes manifest. Note that the following manifest contains resource limits that may not be appropriate for a production environment, review our guide on {scalingGuideLink} before deploying this manifest."
      values={{
        scalingGuideLink: (
          <EuiLink
            external
            href={docLinks.links.fleet.scalingKubernetesResourcesAndLimits}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.fleet.fleet.agentEnrollment.k8ScalingGuideLinkText"
              defaultMessage="Scaling Elastic Agent on Kubernetes"
            />
          </EuiLink>
        ),
      }}
    />
  );

  const k8sCopyYaml = (
    <EuiCopy textToCopy={yaml}>
      {(copy) => (
        <EuiButton onClick={() => onCopyButtonClick(copy)} iconType="copyClipboard">
          {copyButtonClicked ? (
            <FormattedMessage
              id="xpack.fleet.enrollmentInstructions.copyPolicyButtonClicked"
              defaultMessage="Copied"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.enrollmentInstructions.copyPolicyButton"
              defaultMessage="Copy to clipboard"
            />
          )}
        </EuiButton>
      )}
    </EuiCopy>
  );

  const downloadLink = core.http.basePath.prepend(
    getManifestDownloadLink(fleetServerHost, enrollmentAPIKey)
  );

  const k8sDownloadYaml = (
    <>
      <EuiButton
        target="_blank"
        iconSide="right"
        iconType="popout"
        onClick={() => onDownloadButtonClick(downloadLink)}
      >
        {downloadButtonClicked ? (
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.downloadManifestButtonk8sClicked"
            defaultMessage="Downloaded"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.enrollmentInstructions.downloadManifestButtonk8s"
            defaultMessage="Download manifest"
          />
        )}
      </EuiButton>
    </>
  );

  const k8sYaml = (
    <EuiCodeBlock language="yaml" style={{ maxHeight: 300 }} fontSize="m">
      {yaml}
    </EuiCodeBlock>
  );

  return (
    <>
      <EuiText>{downloadDescription}</EuiText>
      <EuiSpacer size="m" />
      <>{k8sYaml}</>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <>{k8sCopyYaml}</>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <>{k8sDownloadYaml}</>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
