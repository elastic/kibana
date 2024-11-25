/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { StreamDefinition } from '@kbn/streams-plugin/common';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
  } = useStreamsAppParams('/{key}/{tab}/{subtab}');
  const router = useStreamsAppRouter();

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
      <RedirectTo
        path="/{key}/{tab}/{subtab}"
        params={{ path: { key, tab: 'management', subtab: 'route' } }}
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
            router.push('/{key}/{tab}/{subtab}', {
              path: { key, tab: 'management', subtab: optionId },
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
