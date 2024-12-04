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
import { StreamDetailManagement } from '../stream_detail_management';

export function StreamDetailView() {
  const params1 = useStreamsAppParams('/{key}/{tab}', true);

  const params2 = useStreamsAppParams('/{key}/management/{subtab}', true);

  const key = params1?.path?.key || params2.path.key;
  const tab = params1?.path?.tab || 'management';

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { value: streamEntity, refresh } = useStreamsAppFetch(
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
      content: <StreamDetailManagement definition={streamEntity} refreshDefinition={refresh} />,
      label: i18n.translate('xpack.streams.streamDetailView.managementTab', {
        defaultMessage: 'Management',
      }),
    },
  ];

  return (
    <EntityDetailViewWithoutParams
      tabs={tabs}
      entity={entity}
      definition={streamEntity}
      selectedTab={tab}
    />
  );
}
