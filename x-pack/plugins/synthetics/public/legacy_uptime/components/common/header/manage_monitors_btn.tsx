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
import { useHistory } from 'react-router-dom';

import { MONITOR_MANAGEMENT_ROUTE } from '../../../../../common/constants';

export const ManageMonitorsBtn = () => {
  const history = useHistory();

  return (
    <EuiHeaderLink
      aria-label={NAVIGATE_LABEL}
      color="text"
      data-test-subj="syntheticsManagementPageLink"
      href={history.createHref({
        pathname: MONITOR_MANAGEMENT_ROUTE,
      })}
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
