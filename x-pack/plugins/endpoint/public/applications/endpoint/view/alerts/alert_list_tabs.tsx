/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { urlFromQueryParams } from './url_from_query_params';
import { useAlertListSelector } from './hooks/use_alerts_selector';
import * as selectors from '../../store/alerts/selectors';

export const AlertListTabs = memo(() => {
  const history = useHistory();
  const queryParams = useAlertListSelector(selectors.uiQueryParams);
  const isOnClosedAlertsTab = useAlertListSelector(selectors.isOnClosedAlertsTab);

  const onOpenTabClick = useCallback(() => {
    const { closed_alerts, ...paramsWithoutClosedAlerts } = queryParams;
    history.push(urlFromQueryParams(paramsWithoutClosedAlerts));
  }, [history, queryParams]);

  const onClosedTabClick = useCallback(() => {
    history.push(urlFromQueryParams({ ...queryParams, closed_alerts: 'true' }));
  }, [history, queryParams]);

  return (
    <>
      <EuiTabs size="s">
        <EuiTab onClick={onOpenTabClick} isSelected={!isOnClosedAlertsTab}>
          <FormattedMessage id="xpack.endpoint.alerts.tabs.open" defaultMessage="Open Alerts" />
        </EuiTab>
        <EuiTab onClick={onClosedTabClick} isSelected={isOnClosedAlertsTab}>
          <FormattedMessage id="xpack.endpoint.alerts.tabs.closed" defaultMessage="Closed Alerts" />
        </EuiTab>
      </EuiTabs>
      <EuiSpacer />
    </>
  );
});
