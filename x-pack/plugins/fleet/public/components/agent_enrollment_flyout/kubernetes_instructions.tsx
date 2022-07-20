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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useGetSettings, useStartServices } from '../../hooks';

import { agentPolicyRouteService } from '../../../common';

import { sendGetK8sManifest } from '../../hooks/use_request/k8s';

interface Props {
  enrollmentAPIKey?: string;
}

export const KubernetesInstructions: React.FunctionComponent<Props> = ({ enrollmentAPIKey }) => {
  const core = useStartServices();
  const settings = useGetSettings();
  const { notifications } = core;

  const [yaml, setYaml] = useState<string>('');
  const [fleetServer, setFleetServer] = useState<string | ''>();

  useEffect(() => {
    async function fetchK8sManifest() {
      try {
        const fleetServerHosts = settings.data?.item.fleet_server_hosts;
        let host = '';
        if (fleetServerHosts !== undefined && fleetServerHosts.length !== 0) {
          setFleetServer(fleetServerHosts[0]);
          host = fleetServerHosts[0];
        }
        const query = { fleetServer: host, enrolToken: enrollmentAPIKey };
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
  }, [notifications.toasts, enrollmentAPIKey, settings.data?.item.fleet_server_hosts]);

  const downloadDescription = (
    <FormattedMessage
      id="xpack.fleet.agentEnrollment.downloadDescriptionForK8s"
      defaultMessage="Copy or download the Kubernetes manifest."
    />
  );

  const k8sCopyYaml = (
    <EuiCopy textToCopy={yaml}>
      {(copy) => (
        <EuiButton onClick={copy} iconType="copyClipboard">
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.copyPolicyButton"
            defaultMessage="Copy to clipboard"
          />
        </EuiButton>
      )}
    </EuiCopy>
  );

  const k8sYaml = (
    <EuiCodeBlock language="yaml" style={{ maxHeight: 300 }} fontSize="m">
      {yaml}
    </EuiCodeBlock>
  );

  const downloadLink = core.http.basePath.prepend(
    `${agentPolicyRouteService.getK8sFullDownloadPath()}?fleetServer=${fleetServer}&enrolToken=${enrollmentAPIKey}`
  );

  const downloadMsg = (
    <FormattedMessage
      id="xpack.fleet.agentEnrollment.downloadManifestButtonk8s"
      defaultMessage="Download Manifest"
    />
  );

  return (
    <>
      <EuiText>{downloadDescription}</EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <>{k8sCopyYaml}</>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton href={downloadLink} target="_blank" iconSide="right" iconType="popout">
            <>{downloadMsg}</>
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <>{k8sYaml}</>
    </>
  );
};
