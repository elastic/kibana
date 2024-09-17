/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
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

function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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

  const [loading, setLoading] = useState(false);

  async function sendPlan() {
    setLoading(true);
    const result = await http.post('/api/apply_change/plan', {
      body: JSON.stringify({
        datastream: id,
        change: JSON.parse(code),
        filter: persistedKqlFilter,
      }),
    });
    setLoading(false);
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
  }

  const debouncedCode = useDebounce(code, 1000);
  const pendingChanges = loading || debouncedCode !== code;

  useEffect(() => {
    if (debouncedCode) {
      sendPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCode]);

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
            onClick={sendPlan}
          >
            {pendingChanges && <EuiLoadingSpinner />}{' '}
            {i18n.translate('xpack.inventory.datasetManagementParseView.checkButtonLabel', {
              defaultMessage: 'Check',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiPanel>
      {plan && (
        <>
          <ResultPanel result={plan} code={code} />
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

function ResultPanel(props: { result: any; code: string }) {
  const {
    core: { http },
  } = useKibana();

  // result.simulatedRun.docs is an array of docs after the change
  // result.docs is an array of docs before the change
  // for each doc, we calculate the diff between the before and after by comparing the value of all the keys.
  const diffs = props.result.simulatedRun.docs.map((after, i) => {
    const before = props.result.docs[i];
    return Object.keys(after.doc._source)
      .map((key) => {
        if (
          JSON.stringify(deepSortKeys(before._source[key])) ===
          JSON.stringify(deepSortKeys(after.doc._source[key]))
        ) {
          return null;
        }
        return {
          key,
          before: before._source[key],
          after: after.doc._source[key],
        };
      })
      .filter((change) => change !== null);
  });

  const relevantColumns = useMemo(() => {
    try {
      return [JSON.parse(props.code).grok.field];
    } catch (e) {
      return [];
    }
  }, [props.code]);

  // grid columns are all the keys that have at least one change
  const gridColumns = useMemo(() => {
    const columns = new Set<string>();
    relevantColumns.forEach((column) => {
      columns.add(column);
    });
    diffs.forEach((diff) => {
      diff.forEach((change) => {
        columns.add(change.key);
      });
    });
    return Array.from(columns).map((column) => ({
      id: column,
      displayAsText: column,
    }));
  }, [diffs, relevantColumns]);

  const visibleColumns = gridColumns.map((column) => column.id);

  // grid rows are an object with all the keys that have at least one change (if a key only existis in after, it is shown as is, if it exists in before, it is shown as before -> after)
  const gridRows = useMemo(() => {
    return diffs
      .map((diff, i) => {
        if (diff.length === 0) {
          return undefined;
        }
        const row: { [key: string]: string } = {};
        relevantColumns.forEach((column) => {
          row[column] = JSON.stringify(
            deepSortKeys(props.result.simulatedRun.docs[i].doc._source[column])
          );
        });
        diff.forEach((change) => {
          if (change.before === undefined) {
            row[change.key] = change.after;
            return;
          }
          row[change.key] = { type: 'change', ...change };
        });
        return row;
      })
      .filter((r) => Boolean(r));
  }, [diffs, props.result.simulatedRun.docs, relevantColumns]);

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
        <EuiCallOut>
          {i18n.translate('xpack.inventory.resultPanel.outOfCallOutLabel', {
            defaultMessage: 'Out of ',
          })}
          {props.result.simulatedRun.docs.length}{' '}
          {i18n.translate('xpack.inventory.resultPanel.documentsCallOutLabel', {
            defaultMessage: 'documents, ',
          })}
          {gridRows.length}{' '}
          {i18n.translate('xpack.inventory.resultPanel.haveChangesCallOutLabel', {
            defaultMessage: 'have changes',
          })}
        </EuiCallOut>
        <EuiDataGrid
          aria-label={i18n.translate('xpack.inventory.resultPanel.euiDataGrid.previewLabel', {
            defaultMessage: 'Preview',
          })}
          columns={gridColumns}
          columnVisibility={{ visibleColumns, setVisibleColumns: () => {} }}
          rowCount={gridRows.length}
          height={300}
          renderCellValue={({ rowIndex, columnId }) => {
            const value = gridRows[rowIndex][columnId];

            if (value && value.type === 'change') {
              return (
                <>
                  <span style={{ color: 'red' }}>{JSON.stringify(value.before)}</span> {'->'}{' '}
                  <span style={{ color: 'green' }}>{JSON.stringify(value.after)}</span>
                </>
              );
            }

            return JSON.stringify(value) || '';
          }}
        />
      </EuiPanel>
    </>
  );
}
