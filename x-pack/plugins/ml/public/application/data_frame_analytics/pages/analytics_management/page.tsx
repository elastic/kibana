/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState } from 'react';

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

import { NavigationMenu } from '../../../components/navigation_menu';
import { DatePickerWrapper } from '../../../components/navigation_menu/date_picker_wrapper';
import { DataFrameAnalyticsList } from './components/analytics_list';
import { useRefreshInterval } from './components/analytics_list/use_refresh_interval';
import { RefreshAnalyticsListButton } from './components/refresh_analytics_list_button';
import { useCreateAnalyticsForm } from './hooks/use_create_analytics_form';
import { NodeAvailableWarning } from '../../../components/node_available_warning';
import { UpgradeWarning } from '../../../components/upgrade';

export const Page: FC = () => {
  const [blockRefresh, setBlockRefresh] = useState(false);

  useRefreshInterval(setBlockRefresh);

  const createAnalyticsForm = useCreateAnalyticsForm();

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
                    defaultMessage="Data frame analytics jobs"
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
            <DataFrameAnalyticsList
              blockRefresh={blockRefresh}
              createAnalyticsForm={createAnalyticsForm}
            />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
