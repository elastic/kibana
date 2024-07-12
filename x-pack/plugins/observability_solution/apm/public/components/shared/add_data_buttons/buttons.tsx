/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IBasePath } from '@kbn/core/public';

export function AddApmAgent({ basePath }: { basePath: IBasePath }) {
  return (
    <EuiButton
      data-test-subj="addApmAgentButton"
      size="s"
      target="_blank"
      href={basePath.prepend('/app/observabilityOnboarding/?category=apm')}
    >
      {i18n.translate('xpack.apm.add.apm.agent.button.', {
        defaultMessage: 'Add APM agent',
      })}
    </EuiButton>
  );
}

export function AssociateServiceLogs() {
  return (
    <EuiButton
      data-test-subj="associateLogsButton"
      size="s"
      target="_blank"
      href="https://ela.st/new-experience-associate-service-logs"
    >
      {i18n.translate('xpack.apm.associate.service.logs.button', {
        defaultMessage: 'Associate existing service logs',
      })}
    </EuiButton>
  );
}

export function CollectServiceLogs({ basePath }: { basePath: IBasePath }) {
  return (
    <EuiButton
      data-test-subj="collectServiceLogsButton"
      size="s"
      target="_blank"
      href={basePath.prepend('/app/observabilityOnboarding/?category=logs')}
    >
      {i18n.translate('xpack.apm.collect.service.logs.button', {
        defaultMessage: 'Collect new service logs',
      })}
    </EuiButton>
  );
}
