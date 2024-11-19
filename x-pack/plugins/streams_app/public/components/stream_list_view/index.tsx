/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiSearchBar } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsAppPageHeader } from '../streams_app_page_header';
import { StreamsAppPageHeaderTitle } from '../streams_app_page_header/streams_app_page_header_title';
import { StreamsAppPageBody } from '../streams_app_page_body';
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

  const streamsListFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /api/streams', {
        signal,
      });
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
          <EuiSearchBar
            query={query}
            box={{
              incremental: true,
            }}
            onChange={(nextQuery) => {
              setQuery(nextQuery.queryText);
            }}
          />
          <StreamsTable listFetch={streamsListFetch} query={query} />
        </EuiFlexGroup>
      </StreamsAppPageBody>
    </EuiFlexGroup>
  );
}
