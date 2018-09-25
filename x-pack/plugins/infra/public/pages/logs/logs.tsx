/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { LogsPageContent } from './page_content';
import { LogsToolbar } from './toolbar';

import { EmptyPage } from '../../components/empty_page';
import { Header } from '../../components/header';
import { ColumnarPage } from '../../components/page';

import { WithLogFilterUrlState } from '../../containers/logs/with_log_filter';
import { WithLogMinimapUrlState } from '../../containers/logs/with_log_minimap';
import { WithLogPositionUrlState } from '../../containers/logs/with_log_position';
import { WithLogTextviewUrlState } from '../../containers/logs/with_log_textview';
import { WithKibanaChrome } from '../../containers/with_kibana_chrome';
import { WithSource } from '../../containers/with_source';

export class LogsPage extends React.Component {
  public render() {
    return (
      <ColumnarPage>
        <WithSource>
          {({ logIndicesExist }) =>
            logIndicesExist || logIndicesExist === null ? (
              <>
                <WithLogFilterUrlState />
                <WithLogPositionUrlState />
                <WithLogMinimapUrlState />
                <WithLogTextviewUrlState />
                <Header breadcrumbs={[{ text: 'Logs' }]} />
                <LogsToolbar />
                <LogsPageContent />
              </>
            ) : (
              <WithKibanaChrome>
                {({ basePath }) => (
                  <EmptyPage
                    title="Looks like you don't have any logging indices."
                    message="Let's add some!"
                    actionLabel="Setup Instructions"
                    actionUrl={`${basePath}/app/kibana#/home/tutorial_directory/logging`}
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
