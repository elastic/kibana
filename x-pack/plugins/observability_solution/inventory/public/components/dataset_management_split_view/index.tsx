/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import {
  EuiLoadingSpinner,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiDescriptionList,
  formatNumber,
  EuiAccordion,
  EuiListGroup,
  EuiButton,
  EuiTitle,
  EuiBadge,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { take } from 'lodash';
import { CodeEditor } from '@kbn/code-editor';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useKibana } from '../../hooks/use_kibana';
import { useEsqlQueryResult } from '../../hooks/use_esql_query_result';
import { getInitialColumnsForLogs } from '../../util/get_initial_columns_for_logs';
import { ControlledEsqlGrid } from '../esql_grid/controlled_esql_grid';

export function DatasetManagementSplitView() {
  const {
    path: { id },
  } = useInventoryParams('/datastream/{id}/*');

  const {
    core: { http },
  } = useKibana();

  const baseQuery = `FROM "${id}" | WHERE @timestamp <= NOW() AND @timestamp >= NOW() - 60 minutes`;

  const logsQuery = `${baseQuery} | LIMIT 100`;

  const logsQueryResult = useEsqlQueryResult({ query: logsQuery });

  const columnAnalysis = useMemo(() => {
    if (logsQueryResult.value) {
      return getInitialColumnsForLogs({
        datatable: logsQueryResult.value,
      });
    }
    return undefined;
  }, [logsQueryResult]);

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

  const [result, setResult] = React.useState<any>();
  const [code, setCode] = React.useState<string>(`
{
  "reroute": {
    "if" : "ctx['cloud.region']?.contains('us-east-1')",
    "dataset": "us_east_synth"
  }
}
`);

  async function testReroute() {
    const apiResult = await http.post('/api/test_reroute', {
      body: JSON.stringify({
        datastream: id,
        code,
      }),
    });
    setResult(apiResult);
  }

  return details.loading ? (
    <EuiLoadingSpinner />
  ) : (
    <>
      <EuiFlexGroup>
        <EuiButton
          data-test-subj="inventoryDatasetManagementViewSplitUpButton"
          href={`/app/observability/entities/datastream/${id}/management`}
        >
          {i18n.translate(
            'xpack.inventory.datasetManagementSplitView.backToManagementViewButtonLabel',
            { defaultMessage: 'Back to management view' }
          )}
        </EuiButton>
      </EuiFlexGroup>
      {i18n.translate('xpack.inventory.datasetManagementSplitView.thisIsTheUILabel', {
        defaultMessage: 'This is the UI to split up a data stream into different datasets.',
      })}
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          {columnAnalysis?.constants.length ? (
            <>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.inventory.datasetOverview.h3.constantsLabel', {
                      defaultMessage: 'Constants',
                    })}
                  </h3>
                </EuiTitle>
                <EuiFlexGroup direction="row" wrap gutterSize="xs">
                  {take(columnAnalysis.constants, 10).map((constant) => (
                    <EuiBadge color="hollow" key={constant.name}>{`${constant.name}:${
                      constant.value === '' || constant.value === 0 ? '(empty)' : constant.value
                    }`}</EuiBadge>
                  ))}
                  {columnAnalysis.constants.length > 10 ? (
                    <EuiText size="xs">
                      {i18n.translate('xpack.inventory.datasetOverview.moreTextLabel', {
                        defaultMessage: '{overflowCount} more',
                        values: {
                          overflowCount: columnAnalysis.constants.length - 20,
                        },
                      })}
                    </EuiText>
                  ) : null}
                </EuiFlexGroup>
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
          <CodeEditor languageId="json" value={code} onChange={setCode} height={300} />
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
  const byDataset = props.result.simulatedRun.docs.reduce((acc: any, doc: any) => {
    const dataset = doc.doc._source['data_stream.dataset'];
    if (!acc[dataset]) {
      acc[dataset] = [];
    }
    acc[dataset].push(doc.doc);
    return acc;
  }, {});

  const [selectedDataset, setSelectedDataset] = React.useState<string>(Object.keys(byDataset)[0]);
  const [selectedDoc, setSelectedDoc] = React.useState<number>(0);

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder>
        <EuiTabs>
          {Object.keys(byDataset).map((dataset) => (
            <EuiTab
              isSelected={dataset === selectedDataset}
              key={dataset}
              onClick={() => setSelectedDataset(dataset)}
            >
              {i18n.translate('xpack.inventory.resultPanel.datasetTabLabel', {
                defaultMessage: 'Dataset {dataset}',
                values: { dataset },
              })}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiFlexGroup direction="column">
          <EuiDescriptionList
            type="column"
            listItems={[
              {
                title: 'Docs count',
                description: byDataset[selectedDataset].length,
              },
            ]}
          />
        </EuiFlexGroup>
        <EuiButton
          data-test-subj="inventoryResultPanelPreviousButton"
          onClick={() =>
            setSelectedDoc(
              (selectedDoc + byDataset[selectedDataset].length - 1) %
                byDataset[selectedDataset].length
            )
          }
        >
          {i18n.translate('xpack.inventory.resultPanel.previousButtonLabel', {
            defaultMessage: 'Previous',
          })}
        </EuiButton>
        {selectedDoc + 1} / {byDataset[selectedDataset].length}
        <EuiButton
          data-test-subj="inventoryResultPanelNextButton"
          onClick={() => setSelectedDoc((selectedDoc + 1) % byDataset[selectedDataset].length)}
        >
          {i18n.translate('xpack.inventory.resultPanel.nextButtonLabel', {
            defaultMessage: 'Next',
          })}
        </EuiButton>
        <CodeEditor
          height={300}
          languageId="json"
          value={JSON.stringify(byDataset[selectedDataset][selectedDoc], null, 2)}
        />
      </EuiPanel>
      <EuiAccordion buttonContent="Execution Plan" id={'xxxx'}>
        <CodeEditor languageId="json" value={planToConsoleOutput(props.result.plan)} height={300} />
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
    </>
  );
}

function planToConsoleOutput(plan: any) {
  return plan
    .map(
      (step) => `# ${step.title}
${step.method} ${step.path}
${step.body && JSON.stringify(step.body, null, 2)}`
    )
    .join('\n\n');
}
