/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useLinkProps } from '../../../hooks/use_link_props';

export const ManageAlertsContextMenuItem = () => {
  const manageAlertsLinkProps = useLinkProps({
    app: 'management',
    pathname: '/insightsAndAlerting/triggersActions/alerts',
  });
  return (
    <EuiContextMenuItem icon="tableOfContents" key="manageLink" {...manageAlertsLinkProps}>
      <FormattedMessage id="xpack.infra.alerting.manageAlerts" defaultMessage="Manage alerts" />
    </EuiContextMenuItem>
  );
};
