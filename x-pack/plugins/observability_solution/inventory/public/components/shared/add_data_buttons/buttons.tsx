/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Disabling it for now until the EUI team fixes it

/* eslint-disable @elastic/eui/href-or-on-click */
import React from 'react';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';

export const addDataTitle = i18n.translate('xpack.inventory.addDataContextMenu.link', {
  defaultMessage: 'Add data',
});
export const addDataItem = i18n.translate('xpack.inventory.add.apm.agent.button.', {
  defaultMessage: 'Add data',
});

export const associateServiceLogsItem = i18n.translate(
  'xpack.inventory.associate.service.logs.button',
  {
    defaultMessage: 'Associate existing service logs',
  }
);

export const ASSOCIATE_LOGS_LINK = 'https://ela.st/new-experience-associate-service-logs';

export function AssociateServiceLogs({ onClick }: { onClick?: () => void }) {
  return (
    <EuiButton
      data-test-subj="associateServiceLogsButton"
      size="s"
      onClick={onClick}
      href={ASSOCIATE_LOGS_LINK}
      target="_blank"
      iconType="popout"
      iconSide="right"
    >
      {associateServiceLogsItem}
    </EuiButton>
  );
}

export function AddData({ onClick }: { onClick?: () => void }) {
  const {
    services: { share },
  } = useKibana();
  const onboardingLocator = share.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  return (
    <EuiButton
      iconType="plusInCircle"
      data-test-subj="addDataButton"
      size="s"
      onClick={onClick}
      color="primary"
      fill
      href={onboardingLocator?.getRedirectUrl({ category: '' })}
    >
      {addDataItem}
    </EuiButton>
  );
}
