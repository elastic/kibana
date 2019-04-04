/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { injectUICapabilities, UICapabilities } from 'ui/capabilities/react';

import { SnapshotPageContent } from './page_content';
import { SnapshotToolbar } from './toolbar';

import { DocumentTitle } from '../../../components/document_title';
import { NoIndices } from '../../../components/empty_states/no_indices';
import { Header } from '../../../components/header';
import { ColumnarPage } from '../../../components/page';

import { SourceConfigurationFlyout } from '../../../components/source_configuration';
import { WithSourceConfigurationFlyoutState } from '../../../components/source_configuration/source_configuration_flyout_state';
import { WithWaffleFilterUrlState } from '../../../containers/waffle/with_waffle_filters';
import { WithWaffleOptionsUrlState } from '../../../containers/waffle/with_waffle_options';
import { WithWaffleTimeUrlState } from '../../../containers/waffle/with_waffle_time';
import { WithKibanaChrome } from '../../../containers/with_kibana_chrome';
import { SourceErrorPage, SourceLoadingPage, WithSource } from '../../../containers/with_source';

interface SnapshotPageProps extends RouteComponentProps {
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
}

export const SnapshotPage = injectUICapabilities(
  injectI18n(
    class extends React.Component<SnapshotPageProps, {}> {
      public static displayName = 'SnapshotPage';

      public render() {
        const { intl, uiCapabilities } = this.props;

        return (
          <ColumnarPage>
            <DocumentTitle
              title={(previousTitle: string) =>
                intl.formatMessage(
                  {
                    id: 'xpack.infra.infrastructureSnapshotPage.documentTitle',
                    defaultMessage: '{previousTitle} | Snapshot',
                  },
                  {
                    previousTitle,
                  }
                )
              }
            />
            <Header
              breadcrumbs={[
                {
                  href: '#/',
                  text: intl.formatMessage({
                    id: 'xpack.infra.header.infrastructureTitle',
                    defaultMessage: 'Infrastructure',
                  }),
                },
              ]}
              readOnlyBadge={!uiCapabilities.infrastructure.save}
            />
            <SourceConfigurationFlyout
              shouldAllowEdit={uiCapabilities.infrastructure.configureSource as boolean}
            />
            <WithSource>
              {({
                derivedIndexPattern,
                hasFailed,
                isLoading,
                lastFailureMessage,
                load,
                metricIndicesExist,
              }) =>
                isLoading ? (
                  <SourceLoadingPage />
                ) : metricIndicesExist ? (
                  <>
                    <WithWaffleTimeUrlState />
                    <WithWaffleFilterUrlState indexPattern={derivedIndexPattern} />
                    <WithWaffleOptionsUrlState />
                    <SnapshotToolbar />
                    <SnapshotPageContent />
                  </>
                ) : hasFailed ? (
                  <SourceErrorPage errorMessage={lastFailureMessage || ''} retry={load} />
                ) : (
                  <WithKibanaChrome>
                    {({ basePath }) => (
                      <NoIndices
                        title={intl.formatMessage({
                          id: 'xpack.infra.homePage.noMetricsIndicesTitle',
                          defaultMessage: "Looks like you don't have any metrics indices.",
                        })}
                        message={intl.formatMessage({
                          id: 'xpack.infra.homePage.noMetricsIndicesDescription',
                          defaultMessage: "Let's add some!",
                        })}
                        actions={
                          <EuiFlexGroup>
                            <EuiFlexItem>
                              <EuiButton
                                href={`${basePath}/app/kibana#/home/tutorial_directory/metrics`}
                                color="primary"
                                fill
                                data-test-subj="infrastructureViewSetupInstructionsButton"
                              >
                                {intl.formatMessage({
                                  id:
                                    'xpack.infra.homePage.noMetricsIndicesInstructionsActionLabel',
                                  defaultMessage: 'View setup instructions',
                                })}
                              </EuiButton>
                            </EuiFlexItem>
                            {uiCapabilities.infrastructure.configureSource ? (
                              <EuiFlexItem>
                                <WithSourceConfigurationFlyoutState>
                                  {({ enable }) => (
                                    <EuiButton
                                      color="primary"
                                      onClick={enable}
                                      data-test-subj="infrastructureChangeSourceConfigurationButton"
                                    >
                                      {intl.formatMessage({
                                        id: 'xpack.infra.configureSourceActionLabel',
                                        defaultMessage: 'Change source configuration',
                                      })}
                                    </EuiButton>
                                  )}
                                </WithSourceConfigurationFlyoutState>
                              </EuiFlexItem>
                            ) : null}
                          </EuiFlexGroup>
                        }
                        data-test-subj="noMetricsIndicesPrompt"
                      />
                    )}
                  </WithKibanaChrome>
                )
              }
            </WithSource>
          </ColumnarPage>
        );
      }
    }
  )
);
