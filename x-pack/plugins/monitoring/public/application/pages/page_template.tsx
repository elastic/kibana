/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTab, EuiTabs } from '@elastic/eui';
import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { IHttpFetchError, ResponseErrorBody } from 'kibana/public';
import { useTitle } from '../hooks/use_title';
import { MonitoringToolbar } from '../../components/shared/toolbar';
import { MonitoringTimeContainer } from '../hooks/use_monitoring_time';
import { PageLoading } from '../../components';
import {
  getSetupModeState,
  isSetupModeFeatureEnabled,
  updateSetupModeData,
} from '../../lib/setup_mode';
import { SetupModeFeature } from '../../../common/enums';
import { AlertsDropdown } from '../../alerts/alerts_dropdown';
import { ActionMenu } from '../../components/action_menu';
import { useRequestErrorHandler } from '../hooks/use_request_error_handler';

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
  const [isRequestPending, setIsRequestPending] = useState(false);
  const history = useHistory();
  const [hasError, setHasError] = useState(false);
  const handleRequestError = useRequestErrorHandler();

  const getPageDataResponseHandler = useCallback(
    (result: any) => {
      setHasError(false);
      return result;
    },
    [setHasError]
  );

  useEffect(() => {
    setIsRequestPending(true);
    getPageData?.()
      .then(getPageDataResponseHandler)
      .catch((err: IHttpFetchError<ResponseErrorBody>) => {
        handleRequestError(err);
        setHasError(true);
      })
      .finally(() => {
        setLoaded(true);
        setIsRequestPending(false);
      });
  }, [getPageData, currentTimerange, getPageDataResponseHandler, handleRequestError]);

  const onRefresh = () => {
    // don't refresh when a request is pending
    if (isRequestPending) return;
    setIsRequestPending(true);
    getPageData?.()
      .then(getPageDataResponseHandler)
      .catch(handleRequestError)
      .finally(() => {
        setIsRequestPending(false);
      });

    if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
      updateSetupModeData();
    }
  };

  const createHref = (route: string) => history.createHref({ pathname: route });

  const isTabSelected = (route: string) => history.location.pathname === route;

  const renderContent = () => {
    if (hasError) return null;
    if (getPageData && !loaded) return <PageLoading />;
    return children;
  };

  return (
    <div className="app-container" data-test-subj="monitoringAppContainer">
      <ActionMenu>
        <AlertsDropdown />
      </ActionMenu>
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
      <div>{renderContent()}</div>
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
