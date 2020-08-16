/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectDynamicSettings } from '../../../state/selectors';
import {
  alertsSelector,
  connectorsSelector,
  createAlertAction,
  deleteAlertAction,
  isAlertDeletedSelector,
  newAlertSelector,
} from '../../../state/alerts/alerts';
import { BellIcon } from './bell_icon';
import { ReactRouterEuiLink } from '../../common/react_router_helpers';
import { MONITOR_ROUTE, SETTINGS_ROUTE } from '../../../../common/constants';

interface Props {
  monitorId: string;
  monitorName?: string;
}

export const EnableMonitorAlert = ({ monitorId, monitorName }: Props) => {
  const [isLoading, setIsLoading] = useState(false);

  const dss = useSelector(selectDynamicSettings);

  const isMonitorPage = useRouteMatch(MONITOR_ROUTE);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const dispatch = useDispatch();

  const onButtonClick = () => setIsPopoverOpen((val) => !val);
  const closePopover = () => setIsPopoverOpen(false);

  const { data: actionConnectors } = useSelector(connectorsSelector);

  const { data: alerts, loading: alertsLoading } = useSelector(alertsSelector);

  const { data: deletedAlertId } = useSelector(isAlertDeletedSelector);

  const { data: newAlert } = useSelector(newAlertSelector);

  const currentAlert = newAlert?.params.search.includes(monitorId);

  const hasAlert = currentAlert
    ? newAlert
    : (alerts?.data ?? []).find((alert) => alert.params.search.includes(monitorId));

  const defaultActions = (actionConnectors ?? []).filter((act) =>
    dss.settings?.defaultConnectors.includes(act.id)
  );

  const enableAlert = () => {
    dispatch(
      createAlertAction.get({
        defaultActions,
        monitorId,
        monitorName,
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
  }, [hasAlert, deletedAlertId]);

  const defaultConnectors = dss?.settings?.defaultConnectors ?? [];

  const showSpinner = isLoading || (alertsLoading && !alerts);

  const onAlertClick = () => {
    if (hasAlert) {
      disableAlert();
    } else {
      if (defaultConnectors.length > 0) {
        enableAlert();
      } else {
        onButtonClick();
      }
    }
  };

  const MonitorPageAlertBtn = (
    <EuiButtonEmpty
      onClick={onAlertClick}
      iconType={hasAlert ? BellIcon : 'bell'}
      iconSide={'right'}
      isLoading={showSpinner}
    >
      {hasAlert ? 'Disable down alert' : 'Enable down alert'}
    </EuiButtonEmpty>
  );

  return defaultConnectors.length > 0 || hasAlert ? (
    <div className="eui-displayInlineBlock" style={{ marginRight: 15 }}>
      {isMonitorPage ? (
        MonitorPageAlertBtn
      ) : showSpinner ? (
        <EuiLoadingSpinner />
      ) : (
        <EuiToolTip content={hasAlert ? 'Disable down alert' : 'Enable down alert'}>
          <EuiButtonIcon
            aria-label={hasAlert ? 'Disable down alert' : 'Enable down alert'}
            onClick={onAlertClick}
            iconType={hasAlert ? BellIcon : 'bell'}
            size="m"
            data-test-subj={
              hasAlert
                ? 'uptimeDisableSimpleDownAlert' + monitorId
                : 'uptimeEnableSimpleDownAlert' + monitorId
            }
          />
        </EuiToolTip>
      )}
    </div>
  ) : (
    <EuiPopover
      button={
        isMonitorPage ? (
          MonitorPageAlertBtn
        ) : (
          <EuiButtonIcon
            aria-label={'Enable down alert'}
            style={{ marginRight: 15 }}
            iconType={'bell'}
            onClick={onButtonClick}
            data-test-subj={'uptimeDisplayDefineConnector'}
          />
        )
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiText style={{ width: '350px' }} data-test-subj={'uptimeSettingsDefineConnector'}>
        To start enabling alerts, please define a default alert action connector in{' '}
        <ReactRouterEuiLink to={SETTINGS_ROUTE} data-test-subj={'uptimeSettingsLink'}>
          Settings
        </ReactRouterEuiLink>
      </EuiText>
    </EuiPopover>
  );
};
