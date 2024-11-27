/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EntityDetailViewWithoutParams, EntityViewTab } from '../entity_detail_view';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { StreamDetailOverview } from '../stream_detail_overview';

export function StreamDetailView() {
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/{tab}');

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { value: streamEntity } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /api/streams/{id}', {
        signal,
        params: {
          path: {
            id: key,
          },
        },
      });
    },
    [streamsRepositoryClient, key]
  );

  const entity = {
    id: key,
    displayName: key,
  };

  const tabs: EntityViewTab[] = [
    {
      name: 'overview',
      content: <StreamDetailOverview definition={streamEntity} />,
      label: i18n.translate('xpack.streams.streamDetailView.overviewTab', {
        defaultMessage: 'Overview',
      }),
    },
    {
      name: 'management',
      content: <></>,
      label: i18n.translate('xpack.streams.streamDetailView.managementTab', {
        defaultMessage: 'Management',
      }),
    },
  ];

  return <EntityDetailViewWithoutParams tabs={tabs} entity={entity} selectedTab={tab} />;
}
