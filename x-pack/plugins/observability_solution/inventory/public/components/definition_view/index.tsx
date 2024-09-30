/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiLoadingSpinner, EuiPanel, EuiText } from '@elastic/eui';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import useAsync from 'react-use/lib/useAsync';
import { InventoryEntityDefinition } from '../../../common/entities';
import { InventoryPageHeader } from '../inventory_page_header';
import { InventoryPageHeaderTitle } from '../inventory_page_header/inventory_page_header_title';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useKibana } from '../../hooks/use_kibana';
import { IngestPipelines } from '../data_stream_management_view/logical_management';
import { MainPipelineView } from '../management_overview_view';
import { useLocation } from 'react-router-dom';
import { DefinitionParseView } from './parse_view';

export function DefinitionView() {
  const {
    services: { inventoryAPIClient },
    dependencies: {
      start: { data, unifiedSearch },
    },
  } = useKibana();
  const {
    path: { definition: type },
  } = useInventoryParams('/definitions/{definition}');
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const [view, setView] = React.useState<'main' | 'parse' | 'reroute'>(
    queryParams.get('initialView') || 'main'
  );

  const { timeRange, setTimeRange } = useDateRange({ data });

  const typeDefinitionFetch = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient
        .fetch('GET /internal/inventory/entities/definition/inventory', {
          signal,
        })
        .then((response) => {
          return response.definitions.find((definition) => definition.type === type);
        });
    },
    [inventoryAPIClient, type]
  );

  const [displayedKqlFilter, setDisplayedKqlFilter] = useState('');
  const [persistedKqlFilter, setPersistedKqlFilter] = useState('');
  const queryObj = useMemo(
    () => ({ query: displayedKqlFilter, language: 'kuery' } as const),
    [displayedKqlFilter]
  );
  function goBack() {
    setView('main');
  }

  // if (view === 'reroute') {
  //   return <DatasetManagementSplitView goBack={goBack} />;
  // }

  if (view === 'parse') {
    return <DefinitionParseView goBack={goBack} entityDefinition={typeDefinitionFetch.value} />;
  }
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <InventoryPageHeader>
        <InventoryPageHeaderTitle
          title={i18n.translate('xpack.inventory.definitionsOverview.pageTitle', {
            defaultMessage: 'Definition {d}',
            values: {
              d: type,
            },
          })}
        />
      </InventoryPageHeader>
      <unifiedSearch.ui.SearchBar
        appName="inventory"
        showQueryInput={true}
        onQuerySubmit={({ dateRange, query: nextQuery }) => {
          setPersistedKqlFilter(displayedKqlFilter);
          setTimeRange(dateRange);
        }}
        onQueryChange={({ dateRange, query: nextQuery }) => {
          if (nextQuery?.query) {
            setDisplayedKqlFilter(nextQuery.query as unknown as string);
          }
        }}
        query={queryObj}
        showFilterBar={false}
        showQueryMenu={false}
        showDatePicker={true}
        onTimeRangeChange={({ dateRange }) => {
          setTimeRange(dateRange);
        }}
        submitOnBlur
        showSubmitButton={false}
        dateRangeFrom={timeRange.from}
        dateRangeTo={timeRange.to}
        displayStyle="inPage"
        disableQueryLanguageSwitcher
        indexPatterns={[]}
      />
      <EuiPanel>
        <EuiFlexGroup direction="column">
          <EuiText>
            <h2>
              {i18n.translate('xpack.inventory.logicalManagementView.h2.ingestProcessingLabel', {
                defaultMessage: 'Ingest processing',
              })}
            </h2>
          </EuiText>
          <EuiFlexGroup>
            <EuiButton
              data-test-subj="inventoryDatasetManagementViewSplitUpButton"
              onClick={() => setView('parse')}
            >
              {i18n.translate('xpack.inventory.datasetManagementView.splitUpButtonLabel', {
                defaultMessage: 'Parse',
              })}
            </EuiButton>
          </EuiFlexGroup>
          {typeDefinitionFetch.value && (
            <div>
              <DefinitionIngestPipelines
                persistedKqlFilter={persistedKqlFilter}
                entityDefinition={typeDefinitionFetch.value}
              />
            </div>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexGroup>
  );
}

export function DefinitionIngestPipelines({
  entityDefinition,
  persistedKqlFilter,
}: {
  entityDefinition: InventoryEntityDefinition;
  persistedKqlFilter: string;
}) {
  const {
    dependencies: {
      start: { data },
    },
    core: { http },
  } = useKibana();
  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });
  const query = useMemo(() => {
    // build a query dsl query that filters for all the identity fields of the entity
    const identityFields = entityDefinition.identityFields;
    const filters = identityFields.map((field) => ({
      exists: {
        field: field.field,
      },
    }));
    // add time rang3e filter
    filters.push({
      range: {
        '@timestamp': {
          gte: start,
          lte: end,
        },
      },
    });

    // return as full query of a search request
    return {
      bool: {
        filter: filters,
      },
    };
  }, [end, entityDefinition.identityFields, start]);

  const pipelines = useAsync(async () => {
    return await http.post('/api/pipelines_for_entity', {
      body: JSON.stringify({
        query,
        kuery: persistedKqlFilter,
      }),
    });
  }, [http, query, persistedKqlFilter]);

  const executionCounts = useMemo(() => {
    if (!pipelines.value) {
      return undefined;
    }
    const perPipeline = pipelines.value.aggregations.pipelines.buckets.reduce(
      (acc: Record<string, number>, pipeline: any) => {
        acc[pipeline.key] = pipeline.doc_count;
        return acc;
      },
      {}
    );
    return {
      total: pipelines.value.hits.total.value,
      perPipeline,
    };
  }, [pipelines.value]);

  if (pipelines.loading) {
    return <EuiLoadingSpinner />;
  }

  if (pipelines.error) {
    return (
      <div>
        {i18n.translate('xpack.inventory.mainPipelineView.div.errorLabel', {
          defaultMessage: 'Error:',
        })}
        {pipelines.error.message}
      </div>
    );
  }

  return (
    <div>
      <MainPipelineView executionCounts={executionCounts} />
    </div>
  );
}
