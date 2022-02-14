/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ACTION_OSQUERY = i18n.translate(
  'xpack.securitySolution.alertsView.osqueryAlertTitle',
  {
    defaultMessage: 'Run Osquery',
  }
);

interface IProps {
  handleClick: () => void;
}

export const OsqueryActionItem = React.memo(({ handleClick }: IProps) => (
  <EuiContextMenuItem
    key="osquery-action-item"
    data-test-subj="osquery-action-item"
    onClick={handleClick}
  >
    {ACTION_OSQUERY}
  </EuiContextMenuItem>
));
