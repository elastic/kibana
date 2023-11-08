/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { DefaultRowActionsProps } from './types';
import { AlertsTableContext } from '../contexts/alerts_table_context';
import { useKibana } from '../../../../common/lib/kibana';

/**
 * Alerts table row action to open the selected alert detail page
 */
export const ViewAlertDetailsAlertAction = memo(
  ({ alert, setFlyoutAlert, onActionExecuted, isAlertDetailsEnabled }: DefaultRowActionsProps) => {
    const {
      http: {
        basePath: { prepend },
      },
    } = useKibana().services;
    const { resolveAlertPagePath } = useContext(AlertsTableContext);

    const alertId = alert[ALERT_UUID]?.[0] ?? null;
    const linkToAlert =
      alertId && resolveAlertPagePath ? prepend(resolveAlertPagePath(alertId)) : null;

    if (isAlertDetailsEnabled && linkToAlert) {
      return (
        <EuiContextMenuItem
          data-test-subj="viewAlertDetailsPage"
          key="viewAlertDetailsPage"
          size="s"
          href={linkToAlert}
        >
          {i18n.translate('xpack.triggersActionsUi.alertsTable.viewAlertDetails', {
            defaultMessage: 'View alert details',
          })}
        </EuiContextMenuItem>
      );
    }

    return (
      <EuiContextMenuItem
        data-test-subj="viewAlertDetailsFlyout"
        key="viewAlertDetailsFlyout"
        size="s"
        onClick={() => {
          onActionExecuted?.();
          setFlyoutAlert({ fields: Object.entries(alert).map(([k, v]) => [k, v?.[0]]) });
        }}
      >
        {i18n.translate('xpack.triggersActionsUi.alertsTable.viewAlertDetails', {
          defaultMessage: 'View alert details',
        })}
      </EuiContextMenuItem>
    );
  }
);
