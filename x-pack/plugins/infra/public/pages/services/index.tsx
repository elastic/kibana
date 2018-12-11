/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EmptyPage } from '../../components/empty_page';
import { Header } from '../../components/header';
import { ColumnarPage } from '../../components/page';

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { InfrastructureBetaBadgeHeaderSection } from '../../components/beta_badge_header_section';
import { WithKibanaChrome } from '../../containers/with_kibana_chrome';

import { SourceErrorPage, SourceLoadingPage, WithSource } from '../../containers/with_source';

interface ServicesPageProps {
  intl: InjectedIntl;
}

export const ServicesPage = injectI18n(
  class extends React.Component<ServicesPageProps, {}> {
    public static displayName = 'ServicesPage';

    public render() {
      const { intl } = this.props;

      return (
        <ColumnarPage>
          <Header appendSections={<InfrastructureBetaBadgeHeaderSection />} />
          <WithSource>
            {({
              derivedIndexPattern,
              hasFailed,
              isLoading,
              lastFailureMessage,
              load,
              metricIndicesExist,
            }) =>
              metricIndicesExist ? (
                <>
                  <div>Hello Services</div>
                </>
              ) : isLoading ? (
                <SourceLoadingPage />
              ) : hasFailed ? (
                <SourceErrorPage errorMessage={lastFailureMessage || ''} retry={load} />
              ) : (
                <WithKibanaChrome>
                  {({ basePath }) => (
                    <EmptyPage
                      title={intl.formatMessage({
                        id: 'xpack.infra.servicesPage.noIndicesTitle',
                        defaultMessage: "Looks like you don't have any indices.",
                      })}
                      message={intl.formatMessage({
                        id: 'xpack.infra.servicesPage.noIndicesDescription',
                        defaultMessage: "Let's add some!",
                      })}
                      actionLabel={intl.formatMessage({
                        id: 'xpack.infra.servicesPage.noIndicesActionLabel',
                        defaultMessage: 'Setup Instructions',
                      })}
                      actionUrl={`${basePath}/app/kibana#/home/tutorial_directory`}
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
);
