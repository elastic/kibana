/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { StreamDefinition } from '@kbn/streams-plugin/common';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiListGroup, EuiText } from '@elastic/eui';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { RedirectTo } from '../redirect_to';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { StreamDetailRouting } from '../stream_detail_routing';
import { StreamDetailEnriching } from '../stream_detail_enriching';
import { StreamDetailSchemaEditor } from '../stream_detail_schema_editor';

type ManagementSubTabs = 'route' | 'enrich' | 'schemaEditor';

function isValidManagementSubTab(value: string): value is ManagementSubTabs {
  return ['route', 'enrich', 'schemaEditor'].includes(value);
}

export function StreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition?: StreamDefinition;
  refreshDefinition: () => void;
}) {
  const {
    path: { key, subtab },
  } = useStreamsAppParams('/{key}/management/{subtab}');
  const router = useStreamsAppRouter();

  if (subtab === 'overview') {
    if (!definition) {
      return null;
    }
    if (definition.managed) {
      return (
        <RedirectTo path="/{key}/management/{subtab}" params={{ path: { key, subtab: 'route' } }} />
      );
    }
    return <UnmanagedStreamOverview definition={definition} />;
  }

  const tabs = {
    route: {
      content: (
        <StreamDetailRouting definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.routingTab', {
        defaultMessage: 'Streams Partitioning',
      }),
    },
    enrich: {
      content: (
        <StreamDetailEnriching definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.enrichingTab', {
        defaultMessage: 'Extract field',
      }),
    },
    schemaEditor: {
      content: (
        <StreamDetailSchemaEditor definition={definition} refreshDefinition={refreshDefinition} />
      ),
      label: i18n.translate('xpack.streams.streamDetailView.schemaEditorTab', {
        defaultMessage: 'Schema editor',
      }),
    },
  };

  if (!isValidManagementSubTab(subtab)) {
    return (
      <RedirectTo path="/{key}/management/{subtab}" params={{ path: { key, subtab: 'route' } }} />
    );
  }

  if (!definition?.managed) {
    return (
      <RedirectTo
        path="/{key}/management/{subtab}"
        params={{ path: { key, subtab: 'overview' } }}
      />
    );
  }

  const selectedTabObject = tabs[subtab];

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend="Management tabs"
          idSelected={subtab}
          onChange={(optionId) => {
            router.push('/{key}/management/{subtab}', {
              path: { key, subtab: optionId },
              query: {},
            });
          }}
          options={Object.keys(tabs).map((id) => ({
            id,
            label: tabs[id as ManagementSubTabs].label,
          }))}
        />
      </EuiFlexItem>
      <EuiFlexItem grow>{selectedTabObject.content}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

function assetToLink(asset: { type: string; id: string }) {
  switch (asset.type) {
    case 'index_template':
      return `/app/management/data/index_management/templates/${asset.id}`;
    case 'component_template':
      return `/app/management/data/index_management/component_templates/${asset.id}`;
    case 'data_stream':
      return `/app/management/data/index_management/data_streams/${asset.id}`;
    case 'ingest_pipeline':
      return `/app/management/ingest/ingest_pipelines?pipeline=${asset.id}`;
    default:
      return '';
  }
}

function assetToTitle(asset: { type: string; id: string }) {
  switch (asset.type) {
    case 'index_template':
      return i18n.translate('xpack.streams.streamDetailView.indexTemplate', {
        defaultMessage: 'Index template',
      });
    case 'component_template':
      return i18n.translate('xpack.streams.streamDetailView.componentTemplate', {
        defaultMessage: 'Component template',
      });
    case 'data_stream':
      return i18n.translate('xpack.streams.streamDetailView.dataStream', {
        defaultMessage: 'Data stream',
      });
    case 'ingest_pipeline':
      return i18n.translate('xpack.streams.streamDetailView.ingestPipeline', {
        defaultMessage: 'Ingest pipeline',
      });
    default:
      return '';
  }
}

function UnmanagedStreamOverview({ definition }: { definition: StreamDefinition }) {
  const groupedAssets = (definition.unmanaged_elasticsearch_assets ?? []).reduce((acc, asset) => {
    const title = assetToTitle(asset);
    if (title) {
      acc[title] = acc[title] ?? [];
      acc[title].push(asset);
    }
    return acc;
  }, {} as Record<string, Array<{ type: string; id: string }>>);
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiText>
        <p>
          {i18n.translate('xpack.streams.streamDetailView.unmanagedStreamOverview', {
            defaultMessage:
              'This stream is not managed. Follow the links to stack management to change the related Elasticsearch objects.',
          })}
        </p>
      </EuiText>
      {Object.entries(groupedAssets).map(([title, assets]) => (
        <div key={title}>
          <EuiText>
            <h3>{title}</h3>
          </EuiText>
          <EuiListGroup
            listItems={assets.map((asset) => ({
              label: asset.id,
              href: assetToLink(asset),
              iconType: 'index',
              target: '_blank',
            }))}
          />
        </div>
      ))}
    </EuiFlexGroup>
  );
}
