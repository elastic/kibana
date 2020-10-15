/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiCallOut, EuiListGroup, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { EuiListGroupItemProps } from '@elastic/eui/src/components/list_group/list_group_item';
import { i18n } from '@kbn/i18n';
import { UptimeSettingsContext } from '../../../../contexts';
import { Alert } from '../../../../../../triggers_actions_ui/public';

interface Props {
  monitorAlerts: Alert[];
  loading: boolean;
}

export const EnabledAlerts = ({ monitorAlerts, loading }: Props) => {
  const { basePath } = useContext(UptimeSettingsContext);

  const listItems: EuiListGroupItemProps[] = [];

  (monitorAlerts ?? []).forEach((alert, ind) => {
    listItems.push({
      label: alert.name,
      href: basePath + '/app/management/insightsAndAlerting/triggersActions/alert/' + alert.id,
      size: 's',
      'data-test-subj': 'uptimeMonitorListDrawerAlert' + ind,
    });
  });

  return (
    <>
      <EuiSpacer />
      <span>
        <EuiText size="xs">
          <h3>
            {i18n.translate('xpack.uptime.monitorList.enabledAlerts.title', {
              defaultMessage: 'Enabled alerts:',
              description: 'Alerts enabled for this monitor',
            })}
          </h3>
        </EuiText>
      </span>
      {listItems.length === 0 && !loading && (
        <EuiCallOut
          size="s"
          title={i18n.translate('xpack.uptime.monitorList.enabledAlerts.noAlert', {
            defaultMessage: 'No alert is enabled for this monitor.',
          })}
        />
      )}
      {loading ? <EuiLoadingSpinner /> : <EuiListGroup listItems={listItems} />}
    </>
  );
};
