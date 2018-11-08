/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';

import { HomePageContent } from './page_content';
import { HomeToolbar } from './toolbar';

import { EmptyPage } from '../../components/empty_page';
import { Header } from '../../components/header';
import { ColumnarPage } from '../../components/page';

import { WithWaffleFilterUrlState } from '../../containers/waffle/with_waffle_filters';
import { WithWaffleOptionsUrlState } from '../../containers/waffle/with_waffle_options';
import { WithWaffleTimeUrlState } from '../../containers/waffle/with_waffle_time';
import { WithKibanaChrome } from '../../containers/with_kibana_chrome';
import { WithSource } from '../../containers/with_source';

interface HomePageProps {
  intl: InjectedIntl;
}

class HomePageUI extends React.PureComponent<HomePageProps, {}> {
  public render() {
    const { intl } = this.props;
    return (
      <ColumnarPage>
        <WithSource>
          {({ metricIndicesExist }) =>
            metricIndicesExist || metricIndicesExist === null ? (
              <>
                <WithWaffleTimeUrlState />
                <WithWaffleFilterUrlState />
                <WithWaffleOptionsUrlState />
                <Header />
                <HomeToolbar />
                <HomePageContent />
              </>
            ) : (
              <WithKibanaChrome>
                {({ basePath }) => (
                  <EmptyPage
                    title={intl.formatMessage({
                      id: 'xpack.infra.homePage.noMetricsIndicesTitle',
                      defaultMessage: "Looks like you don't have any metrics indices.",
                    })}
                    message={intl.formatMessage({
                      id: 'xpack.infra.homePage.noMetricsIndicesDescription',
                      defaultMessage: "Let's add some!",
                    })}
                    actionLabel={intl.formatMessage({
                      id: 'xpack.infra.homePage.noMetricsIndicesActionLabel',
                      defaultMessage: 'Setup Instructions',
                    })}
                    actionUrl={`${basePath}/app/kibana#/home/tutorial_directory/metrics`}
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

export const HomePage = injectI18n(HomePageUI);
