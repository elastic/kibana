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
  EuiPage,
  EuiPageBody,
  EuiTitle,
  EuiPageHeader,
  EuiPageHeaderSection,
} from '@elastic/eui';

import { NavigationMenu } from '../../../components/navigation_menu';
import { DataFrameAnalyticsList } from './components/analytics_list';
import { useRefreshInterval } from './components/analytics_list/use_refresh_interval';
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
                    defaultMessage="Analytics jobs"
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
          </EuiPageHeader>

          <NodeAvailableWarning />
          <UpgradeWarning />

          <DataFrameAnalyticsList
            blockRefresh={blockRefresh}
            createAnalyticsForm={createAnalyticsForm}
          />
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
