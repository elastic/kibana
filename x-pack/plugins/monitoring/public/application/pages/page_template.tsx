/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTab, EuiTabs } from '@elastic/eui';
import React, { useContext, useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useTitle } from '../hooks/use_title';
import { MonitoringToolbar } from '../../components/shared/toolbar';
import { MonitoringTimeContainer } from '../hooks/use_monitoring_time';
import { PageLoading } from '../../components';
import {
  getSetupModeState,
  isSetupModeFeatureEnabled,
  updateSetupModeData,
} from '../setup_mode/setup_mode';
import { SetupModeFeature } from '../../../common/enums';

export interface TabMenuItem {
  id: string;
  label: string;
  testSubj?: string;
  route: string;
}
export interface PageTemplateProps {
  title: string;
  pageTitle?: string;
  tabs?: TabMenuItem[];
  getPageData?: () => Promise<void>;
  product?: string;
}

export const PageTemplate: React.FC<PageTemplateProps> = ({
  title,
  pageTitle,
  tabs,
  getPageData,
  product,
  children,
}) => {
  useTitle('', title);

  const { currentTimerange } = useContext(MonitoringTimeContainer.Context);
  const [loaded, setLoaded] = useState(false);
  const history = useHistory();

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
    const requests = [getPageData?.()];
    if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
      requests.push(updateSetupModeData());
    }

    Promise.allSettled(requests).then((results) => {
      // TODO: handle errors
    });
  };

  const createHref = (route: string) => history.createHref({ pathname: route });

  const isTabSelected = (route: string) => history.location.pathname === route;

  return (
    <div className="app-container">
      <MonitoringToolbar pageTitle={pageTitle} onRefresh={onRefresh} />
      {tabs && (
        <EuiTabs>
          {tabs.map((item, idx) => {
            return (
              <EuiTab
                key={idx}
                disabled={isDisabledTab(product)}
                title={item.label}
                data-test-subj={item.testSubj}
                href={createHref(item.route)}
                isSelected={isTabSelected(item.route)}
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

function isDisabledTab(product: string | undefined) {
  const setupMode = getSetupModeState();
  if (!isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
    return false;
  }

  if (!setupMode.data) {
    return false;
  }

  if (!product) {
    return false;
  }

  const data = setupMode.data[product] || {};
  if (data.totalUniqueInstanceCount === 0) {
    return true;
  }
  if (
    data.totalUniqueInternallyCollectedCount === 0 &&
    data.totalUniqueFullyMigratedCount === 0 &&
    data.totalUniquePartiallyMigratedCount === 0
  ) {
    return true;
  }
  return false;
}
