/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';

export const ManageMonitorsBtn = () => {
  const { basePath } = useUptimeSettingsContext();

  return (
    <EuiHeaderLink
      aria-label={NAVIGATE_LABEL}
      color="text"
      data-test-subj="syntheticsManagementPageLink"
      href={`${basePath}/app/synthetics/monitors`}
    >
      <FormattedMessage
        id="xpack.synthetics.page_header.manageMonitors"
        defaultMessage="Monitor Management"
      />
    </EuiHeaderLink>
  );
};

const NAVIGATE_LABEL = i18n.translate('xpack.synthetics.page_header.manageLink.label', {
  defaultMessage: 'Navigate to the Uptime Monitor Management page',
});
