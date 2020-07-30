/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { EuiButtonIcon, EuiLink, EuiLoadingSpinner, EuiPopover, EuiToolTip } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { MonitorSummary } from '../../../../common/runtime_types';
import { selectDynamicSettings } from '../../../state/selectors';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import {
  alertsSelector,
  connectorsSelector,
  createAlertAction,
  deleteAlertAction,
  isAlertDeleting,
  newAlertSelector,
} from '../../../state/alerts/alerts';
import { BellIcon } from './bell_icon';

interface Props {
  monitor: MonitorSummary;
}

export const EnableMonitorAlert = ({ monitor }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const dss = useSelector(selectDynamicSettings);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const kibana = useKibana();
  const dispatch = useDispatch();

  const path = kibana.services?.application?.getUrlForApp('uptime', { path: 'settings' });

  const onButtonClick = () => setIsPopoverOpen((val) => !val);
  const closePopover = () => setIsPopoverOpen(false);

  const { data: actionConnectors } = useSelector(connectorsSelector);

  const { data: alerts, loading } = useSelector(alertsSelector);
  const { loading: isCreating } = useSelector(newAlertSelector);

  const isDeleting = useSelector(isAlertDeleting);

  const hasAlert = (alerts?.data ?? []).find((alert) =>
    alert.params.search.includes(monitor.monitor_id)
  );

  const defaultActions = (actionConnectors ?? []).filter((act) =>
    dss.settings?.defaultConnectors.includes(act.id)
  );

  const enableAlert = () => {
    dispatch(
      createAlertAction.get({
        defaultActions,
        monitorId: monitor.monitor_id,
        monitorName: monitor.state.monitor.name || monitor.state.url.full,
      })
    );
    setIsLoading(true);
  };

  const disableAlert = () => {
    if (hasAlert) {
      dispatch(
        deleteAlertAction.get({
          alertId: hasAlert.id,
        })
      );
      setIsLoading(true);
    }
  };

  useEffect(() => {
    setIsLoading(false);
  }, [hasAlert]);

  const defaultConnectors = dss?.settings?.defaultConnectors ?? [];

  return defaultConnectors.length > 0 ? (
    <div style={{ marginRight: 15 }}>
      {((isCreating || isDeleting) && isLoading) || loading ? (
        <EuiLoadingSpinner />
      ) : (
        <EuiToolTip content={hasAlert ? 'Disable down alert' : 'Enable down alert'}>
          <EuiButtonIcon
            aria-label={'Enable down alert'}
            onClick={hasAlert ? disableAlert : enableAlert}
            color={hasAlert ? 'success' : 'primary'}
            iconType={hasAlert ? BellIcon : 'bell'}
          />
        </EuiToolTip>
      )}
    </div>
  ) : (
    <EuiPopover
      button={
        <EuiButtonIcon
          aria-label={'Enable down alert'}
          style={{ marginRight: 15 }}
          iconType={'bell'}
          onClick={onButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <div style={{ width: '300px' }}>
        To start enabling alerts, please define a default alert action connector in{' '}
        <EuiLink href={path}>Settings</EuiLink>.
      </div>
    </EuiPopover>
  );
};
