/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsAppPageHeader } from '../streams_app_page_header';
import { StreamsAppPageHeaderTitle } from '../streams_app_page_header/streams_app_page_header_title';
import { StreamsAppPageBody } from '../streams_app_page_body';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { StreamsTable } from '../streams_table';

export function StreamListView() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [query, setQuery] = useState('');

  const [submittedQuery, setSubmittedQuery] = useState('');

  const streamsListFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient
        .fetch('GET /api/streams 2023-10-31', {
          signal,
        })
        .then((response) => response.streams);
    },
    [streamsRepositoryClient]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <StreamsAppPageHeader
        title={
          <StreamsAppPageHeaderTitle
            title={i18n.translate('xpack.streams.streamsListViewPageHeaderTitle', {
              defaultMessage: 'Streams',
            })}
          />
        }
      />
      <StreamsAppPageBody>
        <EuiFlexGroup direction="column">
          <StreamsAppSearchBar
            onQueryChange={(next) => {
              setQuery(next.query);
            }}
            onQuerySubmit={(next) => {
              setSubmittedQuery(next.query);
            }}
            query={query}
          />
          <StreamsTable listFetch={streamsListFetch} />
        </EuiFlexGroup>
      </StreamsAppPageBody>
    </EuiFlexGroup>
  );
}
