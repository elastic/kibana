/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCopy,
  EuiCodeBlock,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import semverMajor from 'semver/functions/major';
import semverMinor from 'semver/functions/minor';
import semverPatch from 'semver/functions/patch';

import { useGetSettings, useKibanaVersion, useStartServices } from '../../hooks';

import { agentPolicyRouteService } from '../../../common';

import { sendGetK8sManifest } from '../../hooks/use_request/k8s';

interface Props {
  hasFleetServer: boolean;
  isK8s?: string;
  enrollmentAPIKey?: string;
}

export const DownloadInstructions: React.FunctionComponent<Props> = ({
  hasFleetServer,
  isK8s,
  enrollmentAPIKey,
}) => {
  const kibanaVersion = useKibanaVersion();
  const core = useStartServices();
  const settings = useGetSettings();
  const kibanaVersionURLString = useMemo(
    () =>
      `${semverMajor(kibanaVersion)}-${semverMinor(kibanaVersion)}-${semverPatch(kibanaVersion)}`,
    [kibanaVersion]
  );
  const { notifications } = core;

  const [yaml, setYaml] = useState<string>('');
  const [fleetServer, setFleetServer] = useState<string | ''>();

  useEffect(() => {
    async function fetchK8sManifest() {
      try {
        if (isK8s !== 'IS_KUBERNETES') {
          return;
        }
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
  }, [isK8s, notifications.toasts, enrollmentAPIKey, settings.data?.item.fleet_server_hosts]);

  const downloadDescription = hasFleetServer ? (
    <FormattedMessage
      id="xpack.fleet.agentEnrollment.downloadDescriptionForFleetServer"
      defaultMessage="Fleet Server runs on an Elastic Agent. Install this agent on a centralized host so that other hosts you wish to monitor can connect to it. In production, we recommend using one or more dedicated hosts. You can download the Elastic Agent binaries and verification signatures from Elastic’s download page."
    />
  ) : isK8s === 'IS_KUBERNETES' ? (
    <FormattedMessage
      id="xpack.fleet.agentEnrollment.downloadDescriptionForK8s"
      defaultMessage="Copy or download the Kubernetes manifest inside the Kubernetes cluster. Check {FleetUrlVariable} and {FleetTokenVariable} in the Daemonset environment variables and apply the manifest."
      values={{
        FleetUrlVariable: <EuiCode>FLEET_URL</EuiCode>,
        FleetTokenVariable: <EuiCode>FLEET_ENROLLMENT_TOKEN</EuiCode>,
      }}
    />
  ) : (
    <FormattedMessage
      id="xpack.fleet.agentEnrollment.downloadDescription"
      defaultMessage="Install the Elastic Agent on the hosts you wish to monitor. Do not install this agent policy on a host containing Fleet Server. You can download the Elastic Agent binaries and verification signatures from Elastic’s download page."
    />
  );

  const linuxUsers =
    isK8s !== 'IS_KUBERNETES' ? (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.downloadUseLinuxInstaller"
        defaultMessage="Linux users: We recommend the installer (TAR) over system packages (RPM/DEB) because it lets you upgrade your agent in Fleet."
      />
    ) : (
      ''
    );

  const k8sCopyYaml =
    isK8s === 'IS_KUBERNETES' ? (
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
    ) : (
      ''
    );

  const k8sYaml =
    isK8s === 'IS_KUBERNETES' ? (
      <EuiCodeBlock language="yaml" style={{ maxHeight: 300 }} fontSize="m">
        {yaml}
      </EuiCodeBlock>
    ) : (
      ''
    );

  const downloadLink =
    isK8s === 'IS_KUBERNETES'
      ? core.http.basePath.prepend(
          `${agentPolicyRouteService.getK8sFullDownloadPath()}?fleetServer=${fleetServer}&enrolToken=${enrollmentAPIKey}`
        )
      : `https://www.elastic.co/downloads/past-releases/elastic-agent-${kibanaVersionURLString}`;

  const downloadMsg =
    isK8s === 'IS_KUBERNETES' ? (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.downloadManifestButtonk8s"
        defaultMessage="Download Manifest"
      />
    ) : (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.downloadLink"
        defaultMessage="Go to download page"
      />
    );

  return (
    <>
      <EuiText>{downloadDescription}</EuiText>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <>{linuxUsers}</>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButton href={downloadLink} target="_blank" iconSide="right" iconType="popout">
            <>{downloadMsg}</>
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <>{k8sCopyYaml}</>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <>{k8sYaml}</>
    </>
  );
};
