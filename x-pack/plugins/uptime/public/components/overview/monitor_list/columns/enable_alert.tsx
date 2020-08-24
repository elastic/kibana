/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
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
import {
  DISABLE_LABEL,
  DISABLE_STATUS_ALERT,
  ENABLE_LABEL,
  ENABLE_STATUS_ALERT,
} from './translations';

interface Props {
  monitorId: string;
  monitorName?: string;
}

export const EnableMonitorAlert = ({ monitorId, monitorName }: Props) => {
  const [isLoading, setIsLoading] = useState(false);

  const dss = useSelector(selectDynamicSettings);

  const isMonitorPage = useRouteMatch(MONITOR_ROUTE);

  const dispatch = useDispatch();

  const { data: actionConnectors } = useSelector(connectorsSelector);

  const { data: alerts, loading: alertsLoading } = useSelector(alertsSelector);

  const { data: deletedAlertId } = useSelector(isAlertDeletedSelector);

  const { data: newAlert } = useSelector(newAlertSelector);

  const currentAlert = newAlert?.params.search.includes(monitorId);

  const hasAlert = currentAlert
    ? newAlert
    : (alerts?.data ?? []).find((alert) => alert.params.search.includes(monitorId));

  const defaultActions = (actionConnectors ?? []).filter((act) =>
    dss.settings?.defaultConnectors?.includes(act.id)
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

  const hasDefaultConnectors = (dss?.settings?.defaultConnectors ?? []).length > 0;

  const showSpinner = isLoading || (alertsLoading && !alerts);

  const onAlertClick = () => {
    if (hasAlert) {
      disableAlert();
    } else {
      enableAlert();
    }
  };
  const btnLabel = hasAlert ? DISABLE_STATUS_ALERT : ENABLE_STATUS_ALERT;

  const MonitorPageAlertBtn = (
    <EuiButtonEmpty
      onClick={onAlertClick}
      iconType={hasAlert ? 'bellSlash' : 'bell'}
      isLoading={showSpinner}
    >
      {btnLabel}
    </EuiButtonEmpty>
  );

  return hasDefaultConnectors || hasAlert ? (
    <div className="eui-displayInlineBlock" style={{ marginRight: 10 }}>
      {isMonitorPage ? (
        MonitorPageAlertBtn
      ) : showSpinner ? (
        <EuiLoadingSpinner />
      ) : (
        <EuiToolTip content={btnLabel}>
          <EuiButtonEmpty
            aria-label={btnLabel}
            onClick={onAlertClick}
            iconType={hasAlert ? 'bellSlash' : 'bell'}
            data-test-subj={
              hasAlert
                ? 'uptimeDisableSimpleDownAlert' + monitorId
                : 'uptimeEnableSimpleDownAlert' + monitorId
            }
          >
            {hasAlert ? DISABLE_LABEL : ENABLE_LABEL}
          </EuiButtonEmpty>
        </EuiToolTip>
      )}
    </div>
  ) : (
    <DefineAlertConnectors btnContent={MonitorPageAlertBtn} />
  );
};
