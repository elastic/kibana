/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';

import { LogsPageContent } from './page_content';
import { LogsToolbar } from './toolbar';

import { NoIndices } from '../../components/empty_states/no_indices';
import { Header } from '../../components/header';
import { LogFlyout } from '../../components/logging/log_flyout';
import { ColumnarPage } from '../../components/page';

import { InfraHeaderFeedbackLink } from '../../components/header_feedback_link';
import { SourceConfigurationFlyout } from '../../components/source_configuration';
import { WithSourceConfigurationFlyoutState } from '../../components/source_configuration/source_configuration_flyout_state';
import { WithLogFilter, WithLogFilterUrlState } from '../../containers/logs/with_log_filter';
import { WithLogFlyout } from '../../containers/logs/with_log_flyout';
import { WithFlyoutOptions } from '../../containers/logs/with_log_flyout_options';
import { WithFlyoutOptionsUrlState } from '../../containers/logs/with_log_flyout_options';
import { WithLogMinimapUrlState } from '../../containers/logs/with_log_minimap';
import { WithLogPositionUrlState } from '../../containers/logs/with_log_position';
import { WithLogTextviewUrlState } from '../../containers/logs/with_log_textview';
import { WithKibanaChrome } from '../../containers/with_kibana_chrome';
import { SourceErrorPage, SourceLoadingPage, WithSource } from '../../containers/with_source';

interface Props {
  intl: InjectedIntl;
}

export const LogsPage = injectI18n(
  class extends React.Component<Props> {
    public static displayName = 'LogsPage';

    public render() {
      const { intl } = this.props;

      return (
        <ColumnarPage>
          <Header
            appendSections={<InfraHeaderFeedbackLink url="https://discuss.elastic.co/c/logs" />}
            breadcrumbs={[
              {
                text: intl.formatMessage({
                  id: 'xpack.infra.logsPage.logsBreadcrumbsText',
                  defaultMessage: 'Logs',
                }),
              },
            ]}
          />
          <WithSource>
            {({
              derivedIndexPattern,
              hasFailed,
              isLoading,
              lastFailureMessage,
              load,
              logIndicesExist,
              sourceId,
            }) => (
              <>
                <SourceConfigurationFlyout />
                {isLoading ? (
                  <SourceLoadingPage />
                ) : logIndicesExist ? (
                  <>
                    <WithLogFilterUrlState indexPattern={derivedIndexPattern} />
                    <WithLogPositionUrlState />
                    <WithLogMinimapUrlState />
                    <WithLogTextviewUrlState />
                    <WithFlyoutOptionsUrlState />
                    <LogsToolbar />
                    <WithLogFilter indexPattern={derivedIndexPattern}>
                      {({ applyFilterQueryFromKueryExpression }) => (
                        <React.Fragment>
                          <WithFlyoutOptions>
                            {({ showFlyout, setFlyoutItem }) => (
                              <LogsPageContent
                                showFlyout={showFlyout}
                                setFlyoutItem={setFlyoutItem}
                              />
                            )}
                          </WithFlyoutOptions>
                          <WithLogFlyout sourceId={sourceId}>
                            {({ flyoutItem, hideFlyout, loading }) => (
                              <LogFlyout
                                setFilter={applyFilterQueryFromKueryExpression}
                                flyoutItem={flyoutItem}
                                hideFlyout={hideFlyout}
                                loading={loading}
                              />
                            )}
                          </WithLogFlyout>
                        </React.Fragment>
                      )}
                    </WithLogFilter>
                  </>
                ) : hasFailed ? (
                  <SourceErrorPage errorMessage={lastFailureMessage || ''} retry={load} />
                ) : (
                  <WithKibanaChrome>
                    {({ basePath }) => (
                      <NoIndices
                        title={intl.formatMessage({
                          id: 'xpack.infra.logsPage.noLoggingIndicesTitle',
                          defaultMessage: "Looks like you don't have any logging indices.",
                        })}
                        message={intl.formatMessage({
                          id: 'xpack.infra.logsPage.noLoggingIndicesDescription',
                          defaultMessage: "Let's add some!",
                        })}
                        actions={
                          <EuiFlexGroup>
                            <EuiFlexItem>
                              <EuiButton
                                href={`${basePath}/app/kibana#/home/tutorial_directory/logging`}
                                color="primary"
                                fill
                              >
                                {intl.formatMessage({
                                  id:
                                    'xpack.infra.logsPage.noLoggingIndicesInstructionsActionLabel',
                                  defaultMessage: 'View setup instructions',
                                })}
                              </EuiButton>
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <WithSourceConfigurationFlyoutState>
                                {({ enable }) => (
                                  <EuiButton color="primary" onClick={enable}>
                                    {intl.formatMessage({
                                      id: 'xpack.infra.configureSourceActionLabel',
                                      defaultMessage: 'Change source configuration',
                                    })}
                                  </EuiButton>
                                )}
                              </WithSourceConfigurationFlyoutState>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        }
                      />
                    )}
                  </WithKibanaChrome>
                )}
              </>
            )}
          </WithSource>
        </ColumnarPage>
      );
    }
  }
);
