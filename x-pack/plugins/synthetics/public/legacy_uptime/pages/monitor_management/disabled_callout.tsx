/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { monitorManagementListSelector } from '../../state/selectors';
import { useEnablement } from '../../components/monitor_management/hooks/use_enablement';

export const DisabledCallout = () => {
  const { enablement, enableSynthetics } = useEnablement();
  const { list: monitorList } = useSelector(monitorManagementListSelector);

  const showDisableCallout = !enablement.isEnabled && monitorList.total && monitorList.total > 0;

  if (!showDisableCallout) {
    return null;
  }

  return (
    <>
      <EuiCallOut title={CALLOUT_MANAGEMENT_DISABLED} color="warning" iconType="help">
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
  'xpack.synthetics.monitorManagement.manageMonitorLoadingLabel.disabledCallout.learnMore',
  {
    defaultMessage: 'Learn more',
  }
);

const CALLOUT_MANAGEMENT_DISABLED = i18n.translate(
  'xpack.synthetics.monitorManagement.callout.disabled',
  {
    defaultMessage: 'Monitor Management is disabled',
  }
);

const CALLOUT_MANAGEMENT_CONTACT_ADMIN = i18n.translate(
  'xpack.synthetics.monitorManagement.disabledCallout.adminContact',
  {
    defaultMessage: 'Contact your administrator to enable Monitor Management.',
  }
);

const CALLOUT_MANAGEMENT_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.disabledCallout.description.disabled',
  {
    defaultMessage:
      'Monitor Management is currently disabled and your existing monitors are paused. You can enable Monitor Management to run your monitors.',
  }
);

const SYNTHETICS_ENABLE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsEnableLabel.management',
  {
    defaultMessage: 'Enable Monitor Management',
  }
);
