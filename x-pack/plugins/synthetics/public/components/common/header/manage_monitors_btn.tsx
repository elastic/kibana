/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiHeaderLink, EuiLink, EuiSpacer, EuiTourStep, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { MONITOR_MANAGEMENT_ROUTE } from '../../../../common/constants';
import { PUBLIC_BETA_DESCRIPTION } from '../../../pages/monitor_management/service_allowed_wrapper';
import { ClientPluginsSetup } from '../../../apps/plugin';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';

export const ManageMonitorsBtn = () => {
  const [isOpen, setIsOpen] = useLocalStorage('xpack.uptime.monitorManagement.openTour', true);

  const history = useHistory();

  const { cloud } = useKibana<ClientPluginsSetup>().services;

  const { isDev } = useUptimeSettingsContext();

  const handleOnClick = () => {
    setIsOpen(false);
    history.push(MONITOR_MANAGEMENT_ROUTE + '/all');
  };

  if (!cloud?.isCloudEnabled && !isDev) {
    return null;
  }

  return (
    <EuiTourStep
      content={
        <>
          <EuiText size="s">
            <p>{PUBLIC_BETA_DESCRIPTION}</p>
          </EuiText>
          <EuiSpacer />
          <EuiButton color="primary" fill onClick={handleOnClick}>
            {MONITOR_MANAGEMENT_LABEL}
          </EuiButton>
        </>
      }
      isStepOpen={isOpen}
      onFinish={() => setIsOpen(false)}
      step={1}
      stepsTotal={1}
      subtitle={NEW_LABEL}
      title={GETTING_STARTED_LABEL}
      anchorPosition="upCenter"
      maxWidth={416}
      footerAction={
        <EuiLink data-test-subj="syntheticsManagementTourDismiss" onClick={() => setIsOpen(false)}>
          {DISMISS_LABEL}
        </EuiLink>
      }
    >
      <EuiHeaderLink
        aria-label={NAVIGATE_LABEL}
        color="text"
        data-test-subj="syntheticsManagementPageLink"
        onClick={handleOnClick}
      >
        <FormattedMessage
          id="xpack.uptime.page_header.manageMonitors"
          defaultMessage="Monitor Management"
        />
      </EuiHeaderLink>
    </EuiTourStep>
  );
};

const GETTING_STARTED_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.gettingStarted.label',
  {
    defaultMessage: 'Get started with Synthetic Monitoring',
  }
);

const MONITOR_MANAGEMENT_LABEL = i18n.translate('xpack.uptime.monitorManagement.try.label', {
  defaultMessage: 'Try Monitor Management',
});
const DISMISS_LABEL = i18n.translate('xpack.uptime.monitorManagement.try.dismiss', {
  defaultMessage: 'Dismiss',
});

const NAVIGATE_LABEL = i18n.translate('xpack.uptime.page_header.manageLink.label', {
  defaultMessage: 'Navigate to the Uptime Monitor Management page',
});

const NEW_LABEL = i18n.translate('xpack.uptime.monitorManagement.new.label', {
  defaultMessage: 'New',
});
