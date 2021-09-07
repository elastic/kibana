/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTab, EuiTabs } from '@elastic/eui';
import React, { useContext, useState, useEffect } from 'react';
import { useTitle } from '../hooks/use_title';
import { MonitoringToolbar } from '../../components/shared/toolbar';
import { MonitoringTimeContainer } from './use_monitoring_time';
import { PageLoading } from '../../components';

export interface TabMenuItem {
  id: string;
  label: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
  testSubj: string;
}
interface PageTemplateProps {
  title: string;
  pageTitle?: string;
  tabs?: TabMenuItem[];
  getPageData?: () => Promise<void>;
}

export const PageTemplate: React.FC<PageTemplateProps> = ({
  title,
  pageTitle,
  tabs,
  getPageData,
  children,
}) => {
  useTitle('', title);

  const { currentTimerange } = useContext(MonitoringTimeContainer.Context);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getPageData?.()
      .catch((err) => {
        // TODO: handle errors
      })
      .finally(() => {
        setLoaded(true);
      });
  }, [getPageData, currentTimerange]);

  const onRefresh = () => {
    getPageData?.().catch((err) => {
      // TODO: handle errors
    });
  };

  return (
    <div className="app-container">
      <MonitoringToolbar pageTitle={pageTitle} onRefresh={onRefresh} />
      {tabs && (
        <EuiTabs>
          {tabs.map((item, idx) => {
            return (
              <EuiTab
                key={idx}
                disabled={item.disabled}
                onClick={item.onClick}
                title={item.label}
                data-test-subj={item.testSubj}
              >
                {item.label}
              </EuiTab>
            );
          })}
        </EuiTabs>
      )}
      <div>{!getPageData ? children : loaded ? children : <PageLoading />}</div>
    </div>
  );
};
