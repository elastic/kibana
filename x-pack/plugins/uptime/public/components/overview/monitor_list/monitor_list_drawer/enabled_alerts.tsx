/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiCallOut, EuiListGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { EuiListGroupItemProps } from '@elastic/eui/src/components/list_group/list_group_item';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { UptimeSettingsContext } from '../../../../contexts';
import { deleteAlertAction } from '../../../../state/alerts/alerts';
import { Alert } from '../../../../../../triggers_actions_ui/public';

interface Props {
  monitorAlerts: Alert[];
  loading: boolean;
}

export const EnabledAlerts = ({ monitorAlerts, loading }: Props) => {
  const { basePath } = useContext(UptimeSettingsContext);

  const listItems: EuiListGroupItemProps[] = [];

  const dispatch = useDispatch();

  const deleteAlert = (alertId: string) => dispatch(deleteAlertAction.get({ alertId }));

  (monitorAlerts ?? []).forEach((alert, ind) => {
    listItems.push({
      label: alert.name,
      href: basePath + '/app/management/insightsAndAlerting/triggersActions/alert/' + alert.id,
      iconType: () => <span style={{ marginRight: 5, whiteSpace: 'nowrap' }}>{ind + 1}.</span>,
      size: 's',
      extraAction: {
        color: 'subdued',
        onClick: () => deleteAlert(alert.id),
        iconType: 'trash',
        iconSize: 's',
        'aria-label': i18n.translate('xpack.uptime.monitorList.enabledAlerts.deleteAlert', {
          defaultMessage: 'Delete the alert',
        }),
        alwaysShow: true,
      },
      'data-test-subj': 'uptimeMonitorListDrawerAlert' + ind,
    });
  });

  return (
    <>
      <EuiSpacer />
      <EuiText size="xs">
        <h3>
          {i18n.translate('xpack.uptime.monitorList.enabledAlerts.title', {
            defaultMessage: 'Enabled alerts:',
            description: 'Alerts enabled for this monitor',
          })}
        </h3>
      </EuiText>
      {listItems.length === 0 && !loading && (
        <EuiCallOut
          size="s"
          title={i18n.translate('xpack.uptime.monitorList.enabledAlerts.noAlert', {
            defaultMessage: 'No alert is enabled for this monitor.',
          })}
        />
      )}
      <EuiListGroup listItems={listItems} />
    </>
  );
};
