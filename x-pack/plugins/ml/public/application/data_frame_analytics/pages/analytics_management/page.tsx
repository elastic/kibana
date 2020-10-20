/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useMemo, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiBetaBadge,
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
import { NavigationMenu } from '../../../components/navigation_menu';
import { DatePickerWrapper } from '../../../components/navigation_menu/date_picker_wrapper';
import { DataFrameAnalyticsList } from './components/analytics_list';
import { useRefreshInterval } from './components/analytics_list/use_refresh_interval';
import { RefreshAnalyticsListButton } from './components/refresh_analytics_list_button';
import { NodeAvailableWarning } from '../../../components/node_available_warning';
import { UpgradeWarning } from '../../../components/upgrade';
import { AnalyticsNavigationBar } from './components/analytics_navigation_bar';
import { ModelsList } from './components/models_management';

export const Page: FC = () => {
  const [blockRefresh, setBlockRefresh] = useState(false);

  useRefreshInterval(setBlockRefresh);

  const location = useLocation();
  const selectedTabId = useMemo(() => location.pathname.split('/').pop(), [location]);

  return (
    <Fragment>
      <NavigationMenu tabId="data_frame_analytics" />
      <EuiPage data-test-subj="mlPageDataFrameAnalytics">
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle>
                <h1>
                  <FormattedMessage
                    id="xpack.ml.dataframe.analyticsList.title"
                    defaultMessage="Data frame analytics"
                  />
                  <span>&nbsp;</span>
                  <EuiBetaBadge
                    label={i18n.translate(
                      'xpack.ml.dataframe.analyticsList.experimentalBadgeLabel',
                      {
                        defaultMessage: 'Experimental',
                      }
                    )}
                    tooltipContent={i18n.translate(
                      'xpack.ml.dataframe.analyticsList.experimentalBadgeTooltipContent',
                      {
                        defaultMessage: `Data frame analytics are an experimental feature. We'd love to hear your feedback.`,
                      }
                    )}
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

          <NodeAvailableWarning />
          <UpgradeWarning />

          <EuiPageContent>
            <AnalyticsNavigationBar selectedTabId={selectedTabId} />

            {selectedTabId === 'data_frame_analytics' && (
              <DataFrameAnalyticsList blockRefresh={blockRefresh} />
            )}
            {selectedTabId === 'models' && <ModelsList />}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
