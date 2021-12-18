/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

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
import { i18n } from '@kbn/i18n';
import { NavigationMenu } from '../components/navigation_menu';
import { ModelsList } from './models_management';
import { TrainedModelsNavigationBar } from './navigation_bar';
import { RefreshAnalyticsListButton } from '../data_frame_analytics/pages/analytics_management/components/refresh_analytics_list_button';
import { DatePickerWrapper } from '../components/navigation_menu/date_picker_wrapper';
import { NodesList } from './nodes_overview';

export const Page: FC = () => {
  const location = useLocation();
  const selectedTabId = useMemo(() => location.pathname.split('/').pop(), [location]);

  return (
    <Fragment>
      <NavigationMenu tabId="trained_models" />
      <EuiPage data-test-subj="mlPageModelManagement">
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
                <EuiFlexItem grow={false}>
                  <EuiTitle>
                    <h1>
                      <FormattedMessage
                        id="xpack.ml.trainedModels.title"
                        defaultMessage="Trained Models"
                      />
                    </h1>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBetaBadge
                    label={i18n.translate('xpack.ml.navMenu.trainedModelsTabBetaLabel', {
                      defaultMessage: 'Experimental',
                    })}
                    size="m"
                    color="hollow"
                    tooltipContent={i18n.translate(
                      'xpack.ml.navMenu.trainedModelsTabBetaTooltipContent',
                      {
                        defaultMessage:
                          "Model Management is an experimental feature and subject to change. We'd love to hear your feedback.",
                      }
                    )}
                    tooltipPosition={'right'}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
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
            {selectedTabId === 'nodes' ? <NodesList /> : null}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
