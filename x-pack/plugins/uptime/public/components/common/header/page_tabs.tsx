/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { EuiTabs, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { CERTIFICATES_ROUTE, OVERVIEW_ROUTE } from '../../../../common/constants';
import { useGetUrlParams } from '../../../hooks';
import { stringifyUrlParams } from '../../../lib/helper/stringify_url_params';

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
];

export const PageTabs = () => {
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

  const history = useHistory();

  const params = useGetUrlParams();

  const isOverView = useRouteMatch(OVERVIEW_ROUTE);
  const isCerts = useRouteMatch(CERTIFICATES_ROUTE);

  useEffect(() => {
    if (isOverView?.isExact) {
      setSelectedTabId(OVERVIEW_ROUTE);
    }
    if (isCerts) {
      setSelectedTabId(CERTIFICATES_ROUTE);
    }
    if (!isOverView?.isExact && !isCerts) {
      setSelectedTabId(null);
    }
  }, [isCerts, isOverView]);

  const createHrefForTab = (id: string) => {
    if (selectedTabId === OVERVIEW_ROUTE && id === OVERVIEW_ROUTE) {
      // If we are already on overview route and user clicks again on overview tabs,
      // we will reset the filters
      return history.createHref({ pathname: id });
    }
    return history.createHref({ pathname: id, search: stringifyUrlParams(params, true) });
  };

  const renderTabs = () => {
    return tabs.map(({ dataTestSubj, name, id }, index) => (
      <EuiTab
        onClick={() => setSelectedTabId(id)}
        isSelected={id === selectedTabId}
        key={index}
        data-test-subj={dataTestSubj}
        href={createHrefForTab(id)}
      >
        {name}
      </EuiTab>
    ));
  };

  return (
    <EuiTabs display="condensed" style={{ paddingLeft: 16 }} data-test-subj="uptimeTabs">
      {renderTabs()}
    </EuiTabs>
  );
};
