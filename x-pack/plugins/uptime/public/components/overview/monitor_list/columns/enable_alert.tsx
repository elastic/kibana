/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { EuiLoadingSpinner, EuiToolTip, EuiSwitch } from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectDynamicSettings } from '../../../../state/selectors';
import {
  alertsSelector,
  connectorsSelector,
  createAlertAction,
  deleteAlertAction,
  isAlertDeletedSelector,
  newAlertSelector,
} from '../../../../state/alerts/alerts';
import { MONITOR_ROUTE } from '../../../../../common/constants';
import { DefineAlertConnectors } from './define_connectors';
import { DISABLE_STATUS_ALERT, ENABLE_STATUS_ALERT } from './translations';

interface Props {
  monitorId: string;
  monitorName?: string;
}

export const EnableMonitorAlert = ({ monitorId, monitorName }: Props) => {
  const [isLoading, setIsLoading] = useState(false);

  const { settings } = useSelector(selectDynamicSettings);

  const isMonitorPage = useRouteMatch(MONITOR_ROUTE);

  const dispatch = useDispatch();

  const { data: actionConnectors } = useSelector(connectorsSelector);

  const { data: alerts, loading: alertsLoading } = useSelector(alertsSelector);

  const { data: deletedAlertId } = useSelector(isAlertDeletedSelector);

  const { data: newAlert } = useSelector(newAlertSelector);

  const isNewAlert = newAlert?.params.search.includes(monitorId);

  let hasAlert = (alerts?.data ?? []).find((alert) => alert.params.search.includes(monitorId));

  if (isNewAlert) {
    // if it's newly created alert, we assign that quickly without waiting for find alert result
    hasAlert = newAlert!;
  }
  if (deletedAlertId === hasAlert?.id) {
    // if it just got deleted, we assign that quickly without waiting for find alert result
    hasAlert = undefined;
  }

  const defaultActions = (actionConnectors ?? []).filter((act) =>
    settings?.defaultConnectors?.includes(act.id)
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

  const hasDefaultConnectors = (settings?.defaultConnectors ?? []).length > 0;

  const showSpinner = isLoading || (alertsLoading && !alerts);

  const onAlertClick = () => {
    if (hasAlert) {
      disableAlert();
    } else {
      enableAlert();
    }
  };
  const btnLabel = hasAlert ? DISABLE_STATUS_ALERT : ENABLE_STATUS_ALERT;

  return hasDefaultConnectors || hasAlert ? (
    <div className="eui-displayInlineBlock" style={{ marginRight: 10 }}>
      {
        <EuiToolTip content={btnLabel}>
          <>
            <EuiSwitch
              id={'enableDisableAlertSwitch'}
              compressed={!isMonitorPage}
              disabled={showSpinner}
              label={btnLabel}
              showLabel={!!isMonitorPage}
              aria-label={btnLabel}
              onChange={onAlertClick}
              checked={!!hasAlert}
              data-test-subj={
                hasAlert
                  ? 'uptimeDisableSimpleDownAlert' + monitorId
                  : 'uptimeEnableSimpleDownAlert' + monitorId
              }
            />{' '}
            {showSpinner && <EuiLoadingSpinner className="eui-alignMiddle" />}
          </>
        </EuiToolTip>
      }
    </div>
  ) : (
    <DefineAlertConnectors />
  );
};
