/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import { DocumentTitle } from '../../components/document_title';
import { HelpCenterContent } from '../../components/help_center_content';
import { RoutedTabs } from '../../components/navigation/routed_tabs';
import { ColumnarPage } from '../../components/page';
import { MetricsExplorerOptionsContainer } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { WithMetricsExplorerOptionsUrlState } from '../../containers/metrics_explorer/with_metrics_explorer_options_url_state';
import { WithSource } from '../../containers/with_source';
import { SourceConfigurationFlyoutState } from '../../components/source_configuration';
import { Source } from '../../containers/source';
import { MetricsExplorerPage } from './metrics_explorer';
import { SnapshotPage } from './snapshot';

interface InfrastructurePageProps extends RouteComponentProps {
  intl: InjectedIntl;
}

export const InfrastructurePage = injectI18n(({ match, intl }: InfrastructurePageProps) => (
  <Source.Provider sourceId="default">
    <SourceConfigurationFlyoutState.Provider>
      <ColumnarPage>
        <DocumentTitle
          title={intl.formatMessage({
            id: 'xpack.infra.homePage.documentTitle',
            defaultMessage: 'Infrastructure',
          })}
        />

        <HelpCenterContent
          feedbackLink="https://discuss.elastic.co/c/infrastructure"
          feedbackLinkText={intl.formatMessage({
            id: 'xpack.infra.infrastructure.infrastructureHelpContent.feedbackLinkText',
            defaultMessage: 'Provide feedback for Infrastructure',
          })}
        />

        <RoutedTabs
          tabs={[
            {
              title: intl.formatMessage({
                id: 'xpack.infra.homePage.inventoryTabTitle',
                defaultMessage: 'Inventory',
              }),
              path: `${match.path}/inventory`,
            },
            {
              title: intl.formatMessage({
                id: 'xpack.infra.homePage.metricsExplorerTabTitle',
                defaultMessage: 'Metrics explorer',
              }),
              path: `${match.path}/metrics-explorer`,
            },
          ]}
        />

        <Switch>
          <Route path={`${match.path}/inventory`} component={SnapshotPage} />
          <Route
            path={`${match.path}/metrics-explorer`}
            render={props => (
              <WithSource>
                {({ configuration, derivedIndexPattern }) => (
                  <MetricsExplorerOptionsContainer.Provider>
                    <WithMetricsExplorerOptionsUrlState />
                    <MetricsExplorerPage
                      derivedIndexPattern={derivedIndexPattern}
                      source={configuration}
                      {...props}
                    />
                  </MetricsExplorerOptionsContainer.Provider>
                )}
              </WithSource>
            )}
          />
        </Switch>
      </ColumnarPage>
    </SourceConfigurationFlyoutState.Provider>
  </Source.Provider>
));
