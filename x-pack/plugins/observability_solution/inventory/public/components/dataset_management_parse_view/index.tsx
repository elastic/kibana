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
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { calculateDiff } from '@kbn/unified-data-table/src/components/compare_documents/hooks/calculate_diff';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useKibana } from '../../hooks/use_kibana';
import { useEsqlQueryResult } from '../../hooks/use_esql_query_result';
import { getInitialColumnsForLogs } from '../../util/get_initial_columns_for_logs';
import { ControlledEsqlGrid } from '../esql_grid/controlled_esql_grid';
import { planToConsoleOutput } from '../dataset_detail_view/utils';

function deepSortKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepSortKeys);
  } else if (obj !== null && typeof obj === 'object') {
    const sortedObj: { [key: string]: any } = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sortedObj[key] = deepSortKeys(obj[key]);
      });
    return sortedObj;
  }
  return obj;
}

function cleanDoc(doc: any): any {
  return doc._source;
}

export function DatasetManagementParseView() {
  const {
    path: { id },
  } = useInventoryParams('/data_stream/{id}/*');

  const {
    core: { http },
    dependencies: {
      start: { unifiedSearch, dataViews },
    },
  } = useKibana();

  const [code, setCode] = React.useState<string>(`{
    "grok": {
      "field": "message",
      "patterns": ["\\\\[%{LOGLEVEL:loglevel}\\\\]"],
      "ignore_failure": true
    }
  }`);

  const [plan, setPlan] = React.useState<unknown>(undefined);
  const [docI, setDocI] = React.useState<number>(0);

  const baseQuery = `FROM "${id}" | WHERE @timestamp <= NOW() AND @timestamp >= NOW() - 60 minutes`;

  const logsQuery = `${baseQuery} | LIMIT 100`;

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

  const logsQueryResult = useEsqlQueryResult({ query: logsQuery, kqlFilter: persistedKqlFilter });

  const columnAnalysis = useMemo(() => {
    if (logsQueryResult.value) {
      return getInitialColumnsForLogs({
        datatable: logsQueryResult.value,
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
        <EuiButton
          data-test-subj="inventoryDatasetManagementViewSplitUpButton"
          href={`/app/observability/entities/data_stream/${id}/management`}
        >
          {i18n.translate(
            'xpack.inventory.datasetManagementSplitView.backToManagementViewButtonLabel',
            { defaultMessage: 'Back to management view' }
          )}
        </EuiButton>
      </EuiFlexGroup>
      {i18n.translate('xpack.inventory.datasetManagementSplitView.thisIsTheUILabel', {
        defaultMessage: 'This is the UI to parse the data in a data stream',
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
              defaultMessage: 'Parsing configuration',
            })}
          </h3>
        </EuiTitle>
        <EuiFlexGroup direction="column">
          <CodeEditor languageId="json" value={code} onChange={setCode} height={300} />
          <EuiButton
            data-test-subj="inventoryDatasetManagementParseViewCheckButton"
            fill
            onClick={async () => {
              const result = await http.post('/api/apply_change/plan', {
                body: JSON.stringify({
                  datastream: id,
                  change: JSON.parse(code),
                  filter: persistedKqlFilter,
                }),
              });
              setPlan({
                ...result,
                diff: result.simulatedRun.docs.map((after, i) =>
                  after.doc
                    ? calculateDiff({
                        diffMode: 'lines',
                        comparisonValue: deepSortKeys(cleanDoc(after.doc)),
                        baseValue: deepSortKeys(cleanDoc(result.docs[i])),
                      })
                    : after
                ),
              });
            }}
          >
            {i18n.translate('xpack.inventory.datasetManagementParseView.checkButtonLabel', {
              defaultMessage: 'Check',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiPanel>
      {plan && (
        <>
          <EuiPanel>
            <EuiText size="m">
              <h1>
                {i18n.translate('xpack.inventory.datasetManagementParseView.h1.testRunLabel', {
                  defaultMessage: 'Test Run',
                })}
              </h1>
            </EuiText>
            <EuiSpacer />
            <EuiButton
              data-test-subj="inventoryDatasetManagementParseViewPreviousButton"
              onClick={() => setDocI((docI - 1) % plan.simulatedRun.docs.length)}
            >
              {i18n.translate('xpack.inventory.datasetManagementParseView.previousButtonLabel', {
                defaultMessage: 'Previous',
              })}
            </EuiButton>
            {docI + 1} / {plan.simulatedRun.docs.length}
            <EuiButton
              data-test-subj="inventoryDatasetManagementParseViewNextButton"
              onClick={() => setDocI((docI + 1) % plan.simulatedRun.docs.length)}
            >
              {i18n.translate('xpack.inventory.datasetManagementParseView.nextButtonLabel', {
                defaultMessage: 'Next',
              })}
            </EuiButton>
            <EuiSpacer />
            <div style={{ overflowY: 'scroll', height: 500 }}>
              {plan.diff[docI].error ? (
                <EuiCallOut color="danger">
                  <pre>{JSON.stringify(plan.simulatedRun.docs[docI], null, 2)}</pre>
                  <pre>{JSON.stringify(plan.docs[docI], null, 2)}</pre>
                </EuiCallOut>
              ) : plan.diff[docI].some((d) => d.added || d.removed) ? (
                <EuiFlexGroup direction="column" gutterSize="none">
                  {plan.diff[docI].map((part, i) => (
                    <span
                      key={i}
                      style={{
                        backgroundColor: part.added
                          ? 'lightgreen'
                          : part.removed
                          ? 'lightcoral'
                          : 'white',
                      }}
                    >
                      <pre>{part.value}</pre>
                    </span>
                  ))}
                </EuiFlexGroup>
              ) : (
                <EuiCallOut>
                  {i18n.translate(
                    'xpack.inventory.datasetManagementParseView.noChangeCallOutLabel',
                    { defaultMessage: 'No change' }
                  )}
                </EuiCallOut>
              )}
            </div>
          </EuiPanel>
          <EuiPanel>
            <EuiText size="m">
              <h3>
                {i18n.translate('xpack.inventory.datasetManagementParseView.h1.planLabel', {
                  defaultMessage: 'Plan',
                })}
              </h3>
            </EuiText>
            <EuiAccordion buttonContent="Execution Plan" id={'xxxx2'}>
              <CodeEditor languageId="json" value={planToConsoleOutput(plan.plan)} height={300} />
            </EuiAccordion>
            <EuiButton
              data-test-subj="inventoryResultPanelExecuteChangeButton"
              onClick={async () => {
                // execute change sending the plan to api/apply_plan
                const apiResult = await http.post('/api/apply_plan', {
                  body: JSON.stringify({
                    plan: plan.plan,
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
      )}
    </>
  );
}

function ResultPanel(props: { result: any }) {
  const {
    core: { http },
  } = useKibana();
  // split props.result.simulatedRun.docs by _source["data_stream.dataset"]
  const byDataset = props.result.simulatedRun.docs.reduce((acc: any, doc: any) => {
    const dataset = doc.doc._source['data_stream.dataset'];
    if (!acc[dataset]) {
      acc[dataset] = [];
    }
    acc[dataset].push(doc.doc);
    return acc;
  }, {});

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
              renderCellValue={({ rowIndex, columnId }) => gridRows[rowIndex][columnId] || ''}
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
