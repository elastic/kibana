/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { InfraClientStartDeps } from '../../../types';

export const ManageAlertsContextMenuItem = () => {
  const {
    services: { observability },
  } = useKibana<InfraClientStartDeps>();
  const manageRulesLinkProps = observability.useRulesLink();
  return (
    <EuiContextMenuItem icon="tableOfContents" key="manageLink" {...manageRulesLinkProps}>
      <FormattedMessage id="xpack.infra.alerting.manageAlerts" defaultMessage="Manage rules" />
    </EuiContextMenuItem>
  );
};
