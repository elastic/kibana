/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiSpacer } from '@elastic/eui';
import { urlFromQueryParams } from './url_from_query_params';
import { useAlertListSelector } from './hooks/use_alerts_selector';
import * as selectors from '../../store/alerts/selectors';

interface NavTabs {
  name: string;
  id: string;
}

const navTabs: NavTabs[] = [
  {
    id: 'open',
    name: i18n.translate('xpack.endpoint.alerts.tabs.open', {
      defaultMessage: 'Open Alerts',
    }),
  },
  {
    id: 'closed',
    name: i18n.translate('xpack.endpoint.alerts.tabs.closed', {
      defaultMessage: 'Closed Alerts',
    }),
  },
];

export const AlertListTabs = memo(() => {
  const history = useHistory();
  const location = useLocation();
  const queryParams = useAlertListSelector(selectors.uiQueryParams);

  const onTabClick = useCallback(
    (tab: NavTabs) => {
      history.push(
        urlFromQueryParams({ ...queryParams, closed_alerts: tab.id === 'open' ? 'true' : 'false' }) // TODO: change this
      );
    },
    [history, queryParams]
  );

  const renderNavTabs = useMemo(() => {
    return navTabs.map((tab, index) => {
      return (
        <EuiTab
          key={index}
          onClick={() => onTabClick(tab)} // TODO: change this
          isSelected={tab.href === location.pathname} // TODO: this will need to happen in a selector or change the format entirely idk
        >
          {tab.name}
        </EuiTab>
      );
    });
  }, [location.pathname, onTabClick]);

  return (
    <>
      <EuiTabs size="s">{renderNavTabs}</EuiTabs>
      <EuiSpacer />
    </>
  );
});
