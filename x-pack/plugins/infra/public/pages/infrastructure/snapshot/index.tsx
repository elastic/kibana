/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import React, { useContext } from 'react';

import { SnapshotPageContent } from './page_content';
import { SnapshotToolbar } from './toolbar';

import { DocumentTitle } from '../../../components/document_title';
import { NoIndices } from '../../../components/empty_states/no_indices';
import { Header } from '../../../components/header';
import { ColumnarPage } from '../../../components/page';

import { SourceConfigurationFlyout } from '../../../components/source_configuration';
import { SourceConfigurationFlyoutState } from '../../../components/source_configuration';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { Source } from '../../../containers/source';
import { WithWaffleFilterUrlState } from '../../../containers/waffle/with_waffle_filters';
import { WithWaffleOptionsUrlState } from '../../../containers/waffle/with_waffle_options';
import { WithWaffleTimeUrlState } from '../../../containers/waffle/with_waffle_time';
import { WithKibanaChrome } from '../../../containers/with_kibana_chrome';

export const SnapshotPage = injectI18n(({ intl }) => {
  const { show } = useContext(SourceConfigurationFlyoutState.Context);
  const {
    derivedIndexPattern,
    hasFailedLoadingSource,
    isLoading,
    loadSourceFailureMessage,
    loadSource,
    metricIndicesExist,
  } = useContext(Source.Context);

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
      />
      <SourceConfigurationFlyout />
      {isLoading ? (
        <SourceLoadingPage />
      ) : metricIndicesExist ? (
        <>
          <WithWaffleTimeUrlState />
          <WithWaffleFilterUrlState indexPattern={derivedIndexPattern} />
          <WithWaffleOptionsUrlState />
          <SnapshotToolbar />
          <SnapshotPageContent />
        </>
      ) : hasFailedLoadingSource ? (
        <SourceErrorPage errorMessage={loadSourceFailureMessage || ''} retry={loadSource} />
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
                    >
                      {intl.formatMessage({
                        id: 'xpack.infra.homePage.noMetricsIndicesInstructionsActionLabel',
                        defaultMessage: 'View setup instructions',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButton color="primary" onClick={show}>
                      {intl.formatMessage({
                        id: 'xpack.infra.configureSourceActionLabel',
                        defaultMessage: 'Change source configuration',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              data-test-subj="noMetricsIndicesPrompt"
            />
          )}
        </WithKibanaChrome>
      )}
    </ColumnarPage>
  );
});
