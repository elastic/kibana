/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { EuiButtonIcon, EuiLink, EuiLoadingSpinner, EuiPopover } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { MonitorSummary } from '../../../../common/runtime_types';
import { alertsSelector, selectDynamicSettings } from '../../../state/selectors';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import {
  connectorsSelector,
  createAlertAction,
  newAlertSelector,
} from '../../../state/alerts/alerts';

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
    dispatch(
      createAlertAction.get({
        defaultActions,
        monitorId: monitor.monitor_id,
        monitorName: monitor.state.monitor.name || monitor.state.url.full,
      })
    );
    setIsLoading(true);
  };

  useEffect(() => {
    setIsLoading(false);
  }, [hasAlert]);

  const bellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M7.58 4.08L6.15 2.65C3.75 4.48 2.17 7.3 2.03 10.5h2c.15-2.65 1.51-4.97 3.55-6.42zm12.39 6.42h2c-.15-3.2-1.73-6.02-4.12-7.85l-1.42 1.43c2.02 1.45 3.39 3.77 3.54 6.42zM18 11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2v-5zm-6 11c.14 0 .27-.01.4-.04.65-.14 1.18-.58 1.44-1.18.1-.24.15-.5.15-.78h-4c.01 1.1.9 2 2.01 2z" />
    </svg>
  );

  return dss?.settings?.defaultConnectors?.length > 0 ? (
    <div style={{ marginRight: 15 }}>
      {(isCreating && isLoading) || loading ? (
        <EuiLoadingSpinner />
      ) : (
        <EuiButtonIcon
          aria-label={'Enable down alert'}
          onClick={enableAlert}
          color={hasAlert ? 'success' : 'primary'}
          iconType={hasAlert ? bellIcon : 'bell'}
        />
      )}
    </div>
  ) : (
    <EuiPopover
      button={
        <EuiButtonIcon style={{ marginRight: 15 }} iconType={'bell'} onClick={onButtonClick} />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <div style={{ width: '300px' }}>
        To enable an alert, please define a default connector in{' '}
        <EuiLink href={path}>settings</EuiLink>.
      </div>
    </EuiPopover>
  );
};
