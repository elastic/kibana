/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

export class HomePage extends React.PureComponent {
  public render() {
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
                    title="Looks like you don't have any metrics indices."
                    message="Let's add some!"
                    actionLabel="Setup Instructions"
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
