/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';

import { useLocation } from 'react-router-dom';
import { NavigationMenu } from '../components/navigation_menu';
import { ModelsList } from './models_management';
import { TrainedModelsNavigationBar } from './navigation_bar';
import { RefreshAnalyticsListButton } from '../data_frame_analytics/pages/analytics_management/components/refresh_analytics_list_button';
import { DatePickerWrapper } from '../components/navigation_menu/date_picker_wrapper';
import { useRefreshAnalyticsList } from '../data_frame_analytics/common';
import { useRefreshInterval } from '../data_frame_analytics/pages/analytics_management/components/analytics_list/use_refresh_interval';

export const Page: FC = () => {
  useRefreshInterval(() => {});

  useRefreshAnalyticsList({ isLoading: () => {} });
  const location = useLocation();
  const selectedTabId = useMemo(() => location.pathname.split('/').pop(), [location]);

  return (
    <Fragment>
      <NavigationMenu tabId="trained_models" />
      <EuiPage data-test-subj="mlPageDataFrameAnalytics">
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle>
                <h1>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.title"
                    defaultMessage="Trained Models"
                  />
                </h1>
              </EuiTitle>
            </EuiPageHeaderSection>
            <EuiPageHeaderSection>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <RefreshAnalyticsListButton />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <DatePickerWrapper />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageHeaderSection>
          </EuiPageHeader>

          <EuiPageContent>
            <TrainedModelsNavigationBar selectedTabId={selectedTabId} />
            {selectedTabId === 'trained_models' ? <ModelsList /> : null}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
