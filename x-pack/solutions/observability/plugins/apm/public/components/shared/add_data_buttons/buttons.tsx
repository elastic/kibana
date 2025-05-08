/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Disabling it for now until the EUI team fixes it
/* eslint-disable @elastic/eui/href-or-on-click */

import type { EuiButtonSize } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

export const addApmDataProps = (
  locator: LocatorPublic<ObservabilityOnboardingLocatorParams> | undefined
) => {
  return {
    name: i18n.translate('xpack.apm.add.apm.agent.button.', {
      defaultMessage: 'Add APM',
    }),
    link: locator?.getRedirectUrl({ category: 'application' }),
  };
};

export const associateServiceLogsProps = {
  name: i18n.translate('xpack.apm.associate.service.logs.button', {
    defaultMessage: 'Associate existing service logs',
  }),
  link: 'https://ela.st/new-experience-associate-service-logs',
};

export const collectServiceLogsProps = (
  locator: LocatorPublic<ObservabilityOnboardingLocatorParams> | undefined
) => {
  return {
    name: i18n.translate('xpack.apm.collect.service.logs.button', {
      defaultMessage: 'Collect new service logs',
    }),
    link:
      locator?.getRedirectUrl({
        source: 'auto-detect',
      }) ?? '',
  };
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

  const onboardingLocator = locators.get<ObservabilityOnboardingLocatorParams>(
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
  const {
    share: {
      url: { locators },
    },
  } = useApmPluginContext();

  const onboardingLocator = locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
  const { name, link } = collectServiceLogsProps(onboardingLocator);

  return (
    <EuiButton
      data-test-subj="collectServiceLogsPropsButton"
      size="s"
      onClick={onClick}
      href={basePath.prepend(link)}
    >
      {name}
    </EuiButton>
  );
}
