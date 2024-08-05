/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Disabling it for now until the EUI team fixes it
/* eslint-disable @elastic/eui/href-or-on-click */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

export const addApmData = {
  name: i18n.translate('xpack.apm.add.apm.agent.button.', {
    defaultMessage: 'Add APM',
  }),
  link: '/app/observabilityOnboarding/?category=apm',
};

export const associateServiceLogs = {
  name: i18n.translate('xpack.apm.associate.service.logs.button', {
    defaultMessage: 'Associate existing service logs',
  }),
  link: 'https://ela.st/new-experience-associate-service-logs',
};

export const collectServiceLogs = {
  name: i18n.translate('xpack.apm.collect.service.logs.button', {
    defaultMessage: 'Collect new service logs',
  }),
  link: '/app/observabilityOnboarding/customLogs/?category=logs',
};

export function AddApmData({
  onClick,
  ...props
}: {
  onClick?: () => void;
  'data-test-subj': string;
}) {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;

  return (
    <EuiButton
      data-test-subj={props['data-test-subj']}
      size="s"
      onClick={onClick}
      href={basePath.prepend(addApmData.link)}
    >
      {addApmData.name}
    </EuiButton>
  );
}

export function AssociateServiceLogs({ onClick }: { onClick?: () => void }) {
  return (
    <EuiButton
      data-test-subj="associateServiceLogsButton"
      size="s"
      onClick={onClick}
      href={associateServiceLogs.link}
      target="_blank"
      iconType="popout"
      iconSide="right"
    >
      {associateServiceLogs.name}
    </EuiButton>
  );
}

export function CollectServiceLogs({ onClick }: { onClick?: () => void }) {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;

  return (
    <EuiButton
      data-test-subj="collectServiceLogsButton"
      size="s"
      onClick={onClick}
      href={basePath.prepend(collectServiceLogs.link)}
    >
      {collectServiceLogs.name}
    </EuiButton>
  );
}
