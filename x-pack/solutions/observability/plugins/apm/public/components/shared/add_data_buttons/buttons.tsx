/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Disabling it for now until the EUI team fixes it
/* eslint-disable @elastic/eui/href-or-on-click */

import { EuiButton, EuiButtonSize } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import {
  ApmOnboardingLocatorCategory,
  ApmOnboardingLocatorParams,
} from '../../../locator/onboarding_locator';

export const addApmDataProps = (locator: LocatorPublic<ApmOnboardingLocatorParams> | undefined) => {
  return {
    name: i18n.translate('xpack.apm.add.apm.agent.button.', {
      defaultMessage: 'Add APM',
    }),
    link: locator?.getRedirectUrl({ category: ApmOnboardingLocatorCategory.Apm }),
  };
};

export const associateServiceLogsProps = {
  name: i18n.translate('xpack.apm.associate.service.logs.button', {
    defaultMessage: 'Associate existing service logs',
  }),
  link: 'https://ela.st/new-experience-associate-service-logs',
};

export const collectServiceLogsProps = {
  name: i18n.translate('xpack.apm.collect.service.logs.button', {
    defaultMessage: 'Collect new service logs',
  }),
  link: '/app/observabilityOnboarding/customLogs/?category=logs',
};

interface AddApmDataProps {
  onClick?: () => void;
  'data-test-subj': string;
  fill?: boolean;
  size?: EuiButtonSize;
}

export function AddApmData({ fill = false, size = 's', ...props }: AddApmDataProps) {
  const {
    share: {
      url: { locators },
    },
  } = useApmPluginContext();

  const onboardingLocator = locators.get<ApmOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const addApmDataButtonProps = addApmDataProps(onboardingLocator);

  if (!addApmDataButtonProps.link) {
    return;
  }

  return (
    <EuiButton
      data-test-subj={props['data-test-subj']}
      size={size}
      onClick={props.onClick}
      href={addApmDataButtonProps?.link}
      fill={fill}
    >
      {addApmDataButtonProps.name}
    </EuiButton>
  );
}

export function AssociateServiceLogs({ onClick }: { onClick?: () => void }) {
  return (
    <EuiButton
      data-test-subj="associateServiceLogsPropsButton"
      size="s"
      onClick={onClick}
      href={associateServiceLogsProps.link}
      target="_blank"
      iconType="popout"
      iconSide="right"
    >
      {associateServiceLogsProps.name}
    </EuiButton>
  );
}

export function CollectServiceLogs({ onClick }: { onClick?: () => void }) {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;

  return (
    <EuiButton
      data-test-subj="collectServiceLogsPropsButton"
      size="s"
      onClick={onClick}
      href={basePath.prepend(collectServiceLogsProps.link)}
    >
      {collectServiceLogsProps.name}
    </EuiButton>
  );
}
