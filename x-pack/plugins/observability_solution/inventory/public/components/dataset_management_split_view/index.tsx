/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import {
  EuiLoadingSpinner,
  EuiPanel,
  EuiFlexGroup,
  EuiText,
  EuiAccordion,
  EuiButton,
  EuiTitle,
  EuiTab,
  EuiTabs,
  EuiDataGrid,
  EuiFlexItem,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useLocation } from 'react-router-dom';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useKibana } from '../../hooks/use_kibana';
import { useEsqlQueryResult } from '../../hooks/use_esql_query_result';
import { getInitialColumnsForLogs } from '../../util/get_initial_columns_for_logs';
import { ControlledEsqlGrid } from '../esql_grid/controlled_esql_grid';
import { planToConsoleOutput } from '../dataset_detail_view/utils';

export function DatasetManagementSplitView({ goBack }: { goBack: () => void }) {
  const {
    path: { displayName: id },
  } = useInventoryParams('/data_stream/{displayName}/*');

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const {
    core: { http },
    dependencies: {
      start: { unifiedSearch, dataViews },
    },
  } = useKibana();

  const baseQuery = `FROM "${id}" | WHERE @timestamp <= NOW() AND @timestamp >= NOW() - 60 minutes`;

  const logsQuery = `${baseQuery} | SORT @timestamp DESC | LIMIT 100`;

  const path = `/internal/dataset_quality/data_streams/${id}/details`;
  const details = useAsync(() => {
    return http.get(path, {
      query: {
        // start is now - 1 hour as iso string
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        // end is now as iso string
        end: new Date().toISOString(),
      },
    });
  }, [path, http]);

  const targets = useAsync(() => {
    return http.get('/api/reroute_targets');
  }, [http]);

  const [result, setResult] = React.useState<any>();
  const [code, setCode] = React.useState<string>(
    queryParams.get('initialCode') ||
      `
{
  "reroute": {
    "if" : "ctx['cloud.region']?.contains('us-east-1')",
    "dataset": "us_east_synth"
  }
}
`
  );

  async function testReroute() {
    const apiResult = await http.post('/api/test_reroute', {
      body: JSON.stringify({
        datastream: id,
        code,
        filter: persistedKqlFilter,
      }),
    });
    setResult(apiResult);
  }

  const [displayedKqlFilter, setDisplayedKqlFilter] = useState('');
  const [persistedKqlFilter, setPersistedKqlFilter] = useState('');

  const dataViewsFetch = useAbortableAsync(() => {
    return dataViews
      .create(
        {
          title: id,
          timeFieldName: '@timestamp',
        },
        false, // skip fetch fields
        true // display errors
      )
      .then((response) => {
        return [response];
      });
  }, [dataViews, id]);

  const queryObj = useMemo(
    () => ({ query: displayedKqlFilter, language: 'kuery' } as const),
    [displayedKqlFilter]
  );

  const logsQueryResult = useEsqlQueryResult({
    query: logsQuery,
    kuery: persistedKqlFilter,
    operationName: 'logs',
  });

  const columnAnalysis = useMemo(() => {
    if (logsQueryResult.value) {
      return getInitialColumnsForLogs({
        response: logsQueryResult.value,
        typeDefinitions: [],
      });
    }
    return undefined;
  }, [logsQueryResult]);

  return details.loading ? (
    <EuiLoadingSpinner />
  ) : (
    <>
      <EuiFlexGroup>
        <EuiButton data-test-subj="inventoryDatasetManagementViewSplitUpButton" onClick={goBack}>
          {i18n.translate(
            'xpack.inventory.datasetManagementSplitView.backToManagementViewButtonLabel',
            { defaultMessage: 'Back to management view' }
          )}
        </EuiButton>
      </EuiFlexGroup>
      {i18n.translate('xpack.inventory.datasetManagementSplitView.thisIsTheUILabel', {
        defaultMessage: 'This is the UI to split up a data stream into different datasets.',
      })}
      <unifiedSearch.ui.SearchBar
        appName="inventory"
        onQuerySubmit={({ dateRange, query: nextQuery }) => {
          setPersistedKqlFilter(displayedKqlFilter);
        }}
        onQueryChange={({ dateRange, query: nextQuery }) => {
          if (nextQuery?.query) {
            setDisplayedKqlFilter(nextQuery.query as unknown as string);
          }
        }}
        query={queryObj}
        showQueryInput
        showFilterBar={false}
        showQueryMenu={false}
        showDatePicker={false}
        showSubmitButton={true}
        onRefresh={() => {}}
        displayStyle="inPage"
        disableQueryLanguageSwitcher
        placeholder={'Search'}
        indexPatterns={dataViewsFetch.value}
      />
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          {columnAnalysis?.constants.length ? (
            <>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.inventory.datasetOverview.h3.constantsLabel', {
                      defaultMessage: 'Raw data',
                    })}
                  </h3>
                </EuiTitle>
              </EuiFlexGroup>
            </>
          ) : null}
          <ControlledEsqlGrid
            query={logsQuery}
            result={logsQueryResult}
            initialColumns={columnAnalysis?.initialColumns}
          />
        </EuiFlexGroup>
      </EuiPanel>
      <EuiPanel hasShadow={false} hasBorder>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.inventory.datasetOverview.h3.constantsLabel', {
              defaultMessage: 'Rerouting configuration',
            })}
          </h3>
        </EuiTitle>
        <EuiFlexGroup direction="column">
          <EuiText>
            {i18n.translate(
              'xpack.inventory.datasetManagementSplitView.specifyWhereToRerouteTextLabel',
              { defaultMessage: 'Specify where to reroute on what condition. You can also use' }
            )}
            {'{{service.name}}'}{' '}
            {i18n.translate(
              'xpack.inventory.datasetManagementSplitView.asSyntaxToRereouteTextLabel',
              {
                defaultMessage:
                  'as syntax to rereoute to a dataset based on a field in the doc (in this case service.name).',
              }
            )}
          </EuiText>
          <EuiFlexGroup>
            <EuiFlexItem grow={1}>
              <CodeEditor languageId="json" value={code} onChange={setCode} height={300} />
            </EuiFlexItem>
            <div>
              {targets.loading ? (
                <EuiLoadingSpinner />
              ) : (
                <>
                  {i18n.translate(
                    'xpack.inventory.datasetManagementSplitView.div.existingDatasetsToRerouteLabel',
                    {
                      defaultMessage:
                        'Existing datasets to reroute to (can also create new datasets):',
                    }
                  )}
                  <ul>
                    {targets.value.map((target: any) => (
                      <li key={target}>{target}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </EuiFlexGroup>
          <EuiButton
            data-test-subj="inventoryDatasetManagementSplitViewTestButton"
            onClick={testReroute}
          >
            {i18n.translate('xpack.inventory.datasetManagementSplitView.testButtonLabel', {
              defaultMessage: 'Test',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiPanel>
      {result && <ResultPanel result={result} />}
    </>
  );
}

function ResultPanel(props: { result: any }) {
  const {
    core: { http },
  } = useKibana();
  // split props.result.simulatedRun.docs by _source["data_stream.dataset"]
  const byDataset = useMemo(
    () =>
      props.result.simulatedRun?.docs.reduce((acc: any, doc: any) => {
        const dataset =
          doc.doc?._source?.['data_stream.dataset'] || doc.doc._source?.data_stream?.dataset;
        if (!acc[dataset]) {
          acc[dataset] = [];
        }
        acc[dataset].push(doc.doc);
        return acc;
      }, {}) || { undefined: [] },
    [props.result.simulatedRun?.docs]
  );

  const [selectedDataset, setSelectedDataset] = React.useState<string>(Object.keys(byDataset)[0]);

  const gridColumns = useMemo(() => {
    return Object.keys(byDataset[selectedDataset][0]._source).map((key) => ({
      id: key,
      displayAsText: key,
      width: 100,
    }));
  }, [byDataset, selectedDataset]);

  const visibleColumns = gridColumns.map((column) => column.id);

  const gridRows = useMemo(() => {
    if (!byDataset[selectedDataset]) {
      return undefined;
    }
    return byDataset[selectedDataset].map((doc: any) => {
      return doc._source;
    });
  }, [byDataset, selectedDataset]);

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.inventory.resultPanel.h3.resultsLabel', {
              defaultMessage: 'Results',
            })}
          </h3>
        </EuiTitle>
        <EuiTabs>
          {Object.keys(byDataset).map((dataset) => (
            <EuiTab
              isSelected={dataset === selectedDataset}
              key={dataset}
              onClick={() => setSelectedDataset(dataset)}
            >
              {i18n.translate('xpack.inventory.resultPanel.datasetTabLabel', {
                defaultMessage: 'Dataset {dataset} ({count})',
                values: { dataset, count: byDataset[dataset].length },
              })}
            </EuiTab>
          ))}
        </EuiTabs>
        {byDataset[selectedDataset] && (
          <>
            <EuiDataGrid
              aria-label={i18n.translate('xpack.inventory.resultPanel.euiDataGrid.previewLabel', {
                defaultMessage: 'Preview',
              })}
              columns={gridColumns}
              columnVisibility={{ visibleColumns, setVisibleColumns: () => {} }}
              rowCount={10}
              renderCellValue={({ rowIndex, columnId }) =>
                JSON.stringify(gridRows[rowIndex]?.[columnId]) || ''
              }
            />
          </>
        )}
      </EuiPanel>
      <EuiPanel hasShadow={false} hasBorder>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.inventory.resultPanel.h3.resultsLabel', {
              defaultMessage: 'Apply change',
            })}
          </h3>
        </EuiTitle>
        <EuiText>
          {i18n.translate('xpack.inventory.resultPanel.affectedDatastreamsTextLabel', {
            defaultMessage: 'Affected datastreams:',
          })}
        </EuiText>
        <ul>
          {props.result.affectedDatastreams.map((datastream: any) => (
            <li key={datastream}>{datastream}</li>
          ))}
        </ul>
        <EuiAccordion buttonContent="Execution Plan" id={'xxxx'}>
          <CodeEditor
            languageId="json"
            value={planToConsoleOutput(props.result.plan)}
            height={300}
          />
        </EuiAccordion>
        <EuiButton
          data-test-subj="inventoryResultPanelExecuteChangeButton"
          onClick={async () => {
            // execute change sending the plan to api/apply_plan
            const apiResult = await http.post('/api/apply_plan', {
              body: JSON.stringify({
                plan: props.result.plan,
              }),
            });
            alert(apiResult);
          }}
        >
          {i18n.translate('xpack.inventory.resultPanel.executeChangeButtonLabel', {
            defaultMessage: 'Execute change',
          })}
        </EuiButton>
      </EuiPanel>
    </>
  );
}
