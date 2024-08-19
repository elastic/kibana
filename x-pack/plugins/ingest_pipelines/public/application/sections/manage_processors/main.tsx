/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiPageHeader, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { GEOIP_ID, tabs } from './tabs';
import { useKibana } from '../../../shared_imports';
import { UIM_MANAGE_PROCESSORS } from '../../constants';

export const ManageProcessors: React.FunctionComponent<RouteComponentProps> = () => {
  const { services } = useKibana();
  // Track component loaded
  useEffect(() => {
    services.metric.trackUiMetric(UIM_MANAGE_PROCESSORS);
    services.breadcrumbs.setBreadcrumbs('manage_processors');
  }, [services.metric, services.breadcrumbs]);

  const [selectedTabId, setSelectedTabId] = useState(GEOIP_ID);
  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
      >
        {tab.name}
      </EuiTab>
    ));
  };
  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.pageTitle"
            defaultMessage="Manage Processors"
          />
        }
      />

      <EuiSpacer size="l" />

      <EuiTabs>{renderTabs()}</EuiTabs>
      {selectedTabContent}
    </>
  );
};
