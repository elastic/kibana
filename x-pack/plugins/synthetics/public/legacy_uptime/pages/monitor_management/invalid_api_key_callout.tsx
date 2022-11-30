/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEnablement } from '../../components/monitor_management/hooks/use_enablement';

export const InvalidApiKeyCalloutCallout = () => {
  const { enablement, enableSynthetics, invalidApiKeyError } = useEnablement();

  if (!invalidApiKeyError || !enablement.isEnabled) {
    return null;
  }

  return (
    <>
      <EuiCallOut title={API_KEY_MISSING} color="warning" iconType="help">
        <p>{CALLOUT_MANAGEMENT_DESCRIPTION}</p>
        {enablement.canEnable ? (
          <EuiButton
            fill
            color="primary"
            onClick={() => {
              enableSynthetics();
            }}
          >
            {SYNTHETICS_ENABLE_LABEL}
          </EuiButton>
        ) : (
          <p>
            {CALLOUT_MANAGEMENT_CONTACT_ADMIN}{' '}
            <EuiLink href="#" target="_blank">
              {LEARN_MORE_LABEL}
            </EuiLink>
          </p>
        )}
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};

const LEARN_MORE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.manageMonitorLoadingLabel.callout.invalidKey',
  {
    defaultMessage: 'Learn more',
  }
);

const API_KEY_MISSING = i18n.translate('xpack.synthetics.monitorManagement.callout.apiKeyMissing', {
  defaultMessage: 'Monitor Management is currently disabled because of missing API key',
});

const CALLOUT_MANAGEMENT_CONTACT_ADMIN = i18n.translate(
  'xpack.synthetics.monitorManagement.callout.disabledCallout.invalidKey',
  {
    defaultMessage: 'Contact your administrator to enable Monitor Management.',
  }
);

const CALLOUT_MANAGEMENT_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.callout.description.invalidKey',
  {
    defaultMessage:
      `Monitor Management is currently disabled. To run your monitors in one of Elastic's global managed testing locations,` +
      'you need to re-enable monitor management.',
  }
);

const SYNTHETICS_ENABLE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsEnableLabel.invalidKey',
  {
    defaultMessage: 'Enable monitor management',
  }
);
