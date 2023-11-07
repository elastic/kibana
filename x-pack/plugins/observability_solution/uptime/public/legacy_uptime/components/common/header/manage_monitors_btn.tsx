/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const ManageMonitorsBtn = () => {
  return (
    <EuiToolTip content={NAVIGATE_LABEL}>
      <EuiHeaderLink
        aria-label={NAVIGATE_LABEL}
        color="text"
        data-test-subj="syntheticsManagementPageLink"
      >
        <FormattedMessage
          id="xpack.uptime.page_header.manageMonitors"
          defaultMessage="Monitor Management"
        />
      </EuiHeaderLink>
    </EuiToolTip>
  );
};

const NAVIGATE_LABEL = i18n.translate('xpack.uptime.page_header.manageLink.not', {
  defaultMessage:
    'Monitor Management is no longer available in Uptime, use the Synthetics app instead.',
});
