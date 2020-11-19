/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { EuiTabs, EuiTab, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { CERTIFICATES_ROUTE, OVERVIEW_ROUTE, SETTINGS_ROUTE } from '../../../../common/constants';

const tabs = [
  {
    id: OVERVIEW_ROUTE,
    name: i18n.translate('xpack.uptime.overviewPage.headerText', {
      defaultMessage: 'Overview',
      description: `The text that will be displayed in the app's heading when the Overview page loads.`,
    }),
    dataTestSubj: 'uptimeSettingsToOverviewLink',
  },
  {
    id: CERTIFICATES_ROUTE,
    name: 'Certificates',
    dataTestSubj: 'uptimeCertificatesLink',
  },
  {
    id: SETTINGS_ROUTE,
    dataTestSubj: 'settings-page-link',
    name: i18n.translate('xpack.uptime.page_header.settingsLink', {
      defaultMessage: 'Settings',
    }),
  },
];

export const PageTabs = () => {
  const [selectedTabId, setSelectedTabId] = useState('overview');

  const history = useHistory();

  const isOverView = useRouteMatch(OVERVIEW_ROUTE);
  const isSettings = useRouteMatch(SETTINGS_ROUTE);
  const isCerts = useRouteMatch(CERTIFICATES_ROUTE);

  const onSelectedTabChanged = (routeId: string) => {
    setSelectedTabId(routeId);
    history.push(routeId);
  };

  useEffect(() => {
    if (isOverView?.isExact) {
      setSelectedTabId(OVERVIEW_ROUTE);
    }
    if (isCerts) {
      setSelectedTabId(CERTIFICATES_ROUTE);
    }
    if (isSettings) {
      setSelectedTabId(SETTINGS_ROUTE);
    }
  }, [isOverView, isSettings, isCerts]);

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        key={index}
        data-test-subj={tab.dataTestSubj}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <EuiTabs display="condensed" style={{ paddingLeft: 16 }}>
      {renderTabs()}
    </EuiTabs>
  );
};
