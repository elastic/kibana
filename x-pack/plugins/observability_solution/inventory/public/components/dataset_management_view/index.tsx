/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
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
  EuiFieldText,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { euiLightVars } from '@kbn/ui-theme';
import { ThemeProvider } from 'styled-components';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useKibana } from '../../hooks/use_kibana';
import { planToConsoleOutput } from '../dataset_detail_view/utils';
import { Cytoscape } from './cytoscape';

export function DatasetManagementView() {
  const {
    path: { id },
  } = useInventoryParams('/data_stream/{id}/*');

  const {
    core: { http },
  } = useKibana();

  const path = `/internal/dataset_quality/data_streams/${id}/details`;

  const retentionInfo = useAsync(() => {
    return http.get(`/api/datastream_retention_info/${id}`);
  }, [http, id]);
  console.log(retentionInfo);

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

  return details.loading ? (
    <EuiLoadingSpinner />
  ) : (
    <>
      <StorageDetails details={details.value} />
      <RetentionDetails details={retentionInfo.value} />
      <RoutingDetails id={id} />
      <EuiFlexGroup>
        <EuiButton
          data-test-subj="inventoryDatasetManagementViewSplitUpButton"
          href={`/app/observability/entities/data_stream/${id}/management/split`}
        >
          {i18n.translate('xpack.inventory.datasetManagementView.splitUpButtonLabel', {
            defaultMessage: 'Split up or reroute',
          })}
        </EuiButton>
        <EuiButton
          data-test-subj="inventoryDatasetManagementViewSplitUpButton"
          href={`/app/observability/entities/data_stream/${id}/management/parse`}
        >
          {i18n.translate('xpack.inventory.datasetManagementView.splitUpButtonLabel', {
            defaultMessage: 'Parse',
          })}
        </EuiButton>
      </EuiFlexGroup>
      <EuiAccordion buttonContent="Advanced links" id={'sdfsdf'}>
        <EuiListGroup
          flush={true}
          bordered={true}
          listItems={[
            {
              label: 'Edit in stack management',
              href: `/app/management/data/index_management/data_streams/${id}`,
              iconType: 'indexSettings',
            },
            {
              label: 'View in data set quality',
              href: `/app/management/data/data_quality/details?pageState=(dataStream:${id},v:1)`,
              iconType: 'heart',
            },
          ]}
        />
      </EuiAccordion>
    </>
  );
}

function RetentionDetails(props: { details: any }) {
  const {
    core: { http },
  } = useKibana();

  const [retention, setRetention] = React.useState(
    props.details.datastreamInfo.lifecycle?.data_retention || ''
  );

  const executionPlan = [
    ...(props.details.datastreamInfo.prefer_ilm
      ? props.details.template.name === 'logs'
        ? [
            {
              title: 'Create new index template',
              method: 'PUT',
              path: `/_index_template/${props.details.datastreamInfo.name}@template`,
              body: {
                ...props.details.template.index_template,
                priority: props.details.template.index_template.priority + 100,
                template: {
                  ...props.details.template.index_template.template,
                  settings: {
                    ...props.details.template.index_template.template?.settings,
                    lifecycle: {
                      ...props.details.template.index_template.template?.settings?.lifecycle,
                      prefer_ilm: false,
                    },
                  },
                },
                index_patterns: [props.details.datastreamInfo.name],
              },
            },
            {
              title: 'Roll over data stream',
              method: 'POST',
              path: `/_data_stream/${props.details.datastreamInfo.name}/_rollover`,
            },
          ]
        : [
            {
              title: 'Change template to local retention',
              method: 'PUT',
              path: `/_index_template/${props.details.template.name}`,
              body: {
                ...props.details.template.index_template,
                template: {
                  ...props.details.template.index_template.template,
                  settings: {
                    ...props.details.template.index_template.template?.settings,
                    lifecycle: {
                      ...props.details.template.index_template.template?.settings?.lifecycle,
                      prefer_ilm: false,
                    },
                  },
                },
              },
            },
            {
              title: 'Roll over data stream',
              method: 'POST',
              path: `/_data_stream/${props.details.datastreamInfo.name}/_rollover`,
            },
          ]
      : []),
    {
      title: 'Set local retention',
      method: 'PUT',
      path: `/_data_stream/${props.details.datastreamInfo.name}/_lifecycle`,
      body: {
        data_retention: retention,
      },
    },
  ];
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText>
              <h3>
                {i18n.translate('xpack.inventory.details.h5.storageDetailsLabel', {
                  defaultMessage: 'Retention details',
                })}
              </h3>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <>
          {props.details.datastreamInfo.prefer_ilm && props.details.datastreamInfo.ilm_policy && (
            <>
              <EuiText>
                {i18n.translate('xpack.inventory.retentionDetails.thisDataStreamIsTextLabel', {
                  defaultMessage: 'This data stream is managed by an ilm policy',
                })}
              </EuiText>
              <EuiListGroup
                flush={true}
                bordered={false}
                listItems={[
                  {
                    label: `Edit "${props.details.datastreamInfo.ilm_policy}" in stack management`,
                    href: `/app/management/data/index_lifecycle_management/policies/edit/${props.details.datastreamInfo.ilm_policy}`,
                    iconType: 'indexSettings',
                  },
                ]}
              />
              <EuiText>
                <h5>
                  {i18n.translate('xpack.inventory.details.h5.storageDetailsLabel', {
                    defaultMessage: 'Switch to retention managed on data stream level',
                  })}
                </h5>
              </EuiText>
            </>
          )}
          <EuiFlexGroup>
            <EuiFieldText
              data-test-subj="abc"
              value={retention}
              placeholder="Enter retention (e.g. 7d)"
              onChange={(e) => setRetention(e.target.value)}
            />
            <EuiButton
              onClick={async () => {
                // execute change sending the plan to api/apply_plan
                const apiResult = await http.post('/api/apply_plan', {
                  body: JSON.stringify({
                    plan: executionPlan,
                  }),
                });
                alert(apiResult);
              }}
              data-test-subj="inventoryRetentionDetailsManageOnDataStreamLevelButton"
            >
              {i18n.translate('xpack.inventory.retentionDetails.manageOnDataStreamButtonLabel', {
                defaultMessage: 'Set retention on data stream level',
              })}
            </EuiButton>
          </EuiFlexGroup>
          <EuiAccordion buttonContent="Execution Plan" id={'xxxx2'}>
            <CodeEditor languageId="json" value={planToConsoleOutput(executionPlan)} height={300} />
          </EuiAccordion>
          {props.details.template.name !== 'logs' && props.details.datastreamInfo.prefer_ilm && (
            <>
              <EuiText>
                {i18n.translate('xpack.inventory.resultPanel.affectedDatastreamsTextLabel', {
                  defaultMessage: 'Affected datastreams:',
                })}
              </EuiText>
              <ul>
                {props.details.affectedDatastreams.map((datastream: any) => (
                  <li key={datastream}>{datastream}</li>
                ))}
              </ul>
            </>
          )}
        </>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function StorageDetails(props: { details: any }) {
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText>
              <h3>
                {i18n.translate('xpack.inventory.details.h5.storageDetailsLabel', {
                  defaultMessage: 'Storage details',
                })}
              </h3>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="m" alignItems="flexEnd">
        <EuiDescriptionList
          type="column"
          listItems={[
            {
              title: 'Doc count',
              description: props.details.docsCount,
            },
            {
              title: 'Degraded docs',
              description: props.details.degradedDocsCount,
            },
            {
              title: 'Size in bytes',
              description: formatNumber(props.details.sizeBytes, '0.0 b'),
            },
          ]}
          style={{ maxWidth: '400px' }}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function RoutingDetails(props: { id: string }) {
  const {
    core: {
      http,
      application: { navigateToUrl },
    },
  } = useKibana();
  const processingOverviewInfo = useAsync(() => {
    return http.get(`/api/processing_overview/${props.id}`);
  }, [http, props.id]);

  console.log(processingOverviewInfo);

  const onSelect = useCallback(
    (node: any) => {
      navigateToUrl(`/app/observability/entities/data_stream/${node.data('id')}/management`);
    },
    [navigateToUrl]
  );

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText>
              <h3>
                {i18n.translate('xpack.inventory.details.h5.storageDetailsLabel', {
                  defaultMessage: 'Routing details',
                })}
              </h3>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {processingOverviewInfo.loading ? (
          <EuiLoadingSpinner />
        ) : (
          <>
            <ThemeProvider
              theme={(outerTheme?: any) => ({
                ...outerTheme,
                eui: euiLightVars,
              })}
            >
              <Cytoscape
                elements={[
                  ...processingOverviewInfo.value.nodes.map((node: any) => ({
                    data: {
                      id: node.name,
                      'service.name': node.name === props.id ? node.name : undefined,
                      label: node.name,
                    },
                  })),
                  ...processingOverviewInfo.value.edges.map((edge: any) => ({
                    data: {
                      source: edge.source,
                      target: edge.target,
                    },
                  })),
                ]}
                onSelect={onSelect}
                height={300}
                serviceName=""
                style={{}}
              />
            </ThemeProvider>
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
