/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { EntityTable } from '../entity_table';
import { StreamsAppPageHeader } from '../streams_app_page_header';
import { StreamsAppPageHeaderTitle } from '../streams_app_page_header/streams_app_page_header_title';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';

export function EntityPivotTypeView() {
  const {
    path: { type },
  } = useStreamsAppParams('/{type}');

  const {
    dependencies: {
      start: {
        streamsAPI: { streamsAPIClient },
      },
    },
  } = useKibana();

  const typeDefinitionsFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsAPIClient.fetch('GET /internal/streams_api/types/{type}', {
        signal,
        params: {
          path: {
            type,
          },
        },
      });
    },
    [streamsAPIClient, type]
  );

  const typeDefinition = typeDefinitionsFetch.value?.typeDefinition;

  const title = typeDefinition?.displayName ?? '';

  useStreamsAppBreadcrumbs(() => {
    if (!title) {
      return [];
    }
    return [
      {
        title,
        path: `/{type}`,
        params: { path: { type } },
      } as const,
    ];
  }, [title, type]);

  return (
    <EuiFlexGroup direction="column">
      <StreamsAppPageHeader>
        <StreamsAppPageHeaderTitle title={title} />
      </StreamsAppPageHeader>
      <EntityTable type={type} />
    </EuiFlexGroup>
  );
}
