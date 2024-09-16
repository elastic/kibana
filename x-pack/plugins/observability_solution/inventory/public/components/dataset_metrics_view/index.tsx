/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiIcon,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useTheme } from '@kbn/observability-utils-browser/hooks/use_theme';
import { useKibana } from '../../hooks/use_kibana';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { ErrorCallOut } from '../error_call_out';
import { LoadingPanel } from '../loading_panel';
import type { ExtractMetricDefinitionProcess } from '../../../server/lib/datasets/extract_metric_definitions';
import { UncontrolledEsqlChart } from '../esql_chart/uncontrolled_esql_chart';

export function DatasetMetricsView() {
  const {
    path: { id },
  } = useInventoryParams('/data_stream/{id}/metrics');

  const {
    core: { notifications },
    services: { inventoryAPIClient },
  } = useKibana();

  const theme = useTheme();

  const { loading, value, error } = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch(
        'GET /internal/inventory/datasets/{name}/metrics/definitions',
        {
          params: {
            path: {
              name: id,
            },
          },
          signal,
        }
      );
    },
    [id, inventoryAPIClient]
  );

  const fetchMetricDefinitionsController = useAbortController();

  const [metricDefinitionSuggestions, setMetricDefinitionSuggestions] =
    useLocalStorage<ExtractMetricDefinitionProcess>(`inventory.metricDefinitions.${id}`);

  const [metricExtractionLoading, setMetricExtractionLoading] = useState(false);

  const extractMetricDefinitions = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      inventoryAPIClient
        .stream('POST /internal/inventory/datasets/{name}/metrics/extract', {
          params: {
            path: {
              name: id,
            },
            body: {
              connectorId: 'azure-gpt4o',
            },
          },
          signal: fetchMetricDefinitionsController.signal,
        })
        .subscribe({
          next: (event) => {
            setMetricDefinitionSuggestions(event.process);
          },
          complete: () => {
            resolve();
          },
          error: (err) => {
            reject(err);
          },
        });
    });
  }, [
    id,
    inventoryAPIClient,
    fetchMetricDefinitionsController.signal,
    setMetricDefinitionSuggestions,
  ]);

  if (error) {
    return <ErrorCallOut error={error} />;
  }

  if (loading) {
    return <LoadingPanel size="xl" loading={true} />;
  }

  return (
    <>
      <EuiCallOut
        title={
          !value?.metrics.length
            ? i18n.translate('xpack.inventory.datasetMetricsView.noMetricsCalloutTitle', {
                defaultMessage: 'No metrics defined',
              })
            : i18n.translate('xpack.inventory.datasetMetricsView.suggestMetricsCalloutTitle', {
                defaultMessage: 'Suggest metrics ',
              })
        }
      >
        <EuiFlexGroup direction="column" alignItems="flexStart">
          <EuiText>
            {i18n.translate('xpack.inventory.datasetMetricsView.noMetricsCalloutContent', {
              defaultMessage:
                'Defined metrics help us understand how to visualize your data. Do you want to automatically extract metrics from this dataset?',
            })}
          </EuiText>
          {metricDefinitionSuggestions ? (
            <EuiFlexGroup direction="column">
              {Object.entries(metricDefinitionSuggestions.steps).map(
                ([stepName, { status, label }]) => {
                  return (
                    <EuiFlexGroup key={stepName} direction="row" gutterSize="s" alignItems="center">
                      {status === 'running' ? (
                        <EuiLoadingSpinner size="s" />
                      ) : (
                        <EuiIcon
                          color={status === 'completed' ? theme.colors.successText : undefined}
                          type={status === 'completed' ? 'checkInCircleFilled' : 'dotInCircle'}
                        />
                      )}
                      {label}
                    </EuiFlexGroup>
                  );
                }
              )}
            </EuiFlexGroup>
          ) : null}
          <EuiButton
            isLoading={metricExtractionLoading}
            disabled={metricExtractionLoading}
            data-test-subj="inventoryDatasetMetricsViewExtractMetricDefinitionsButton"
            onClick={() => {
              setMetricExtractionLoading(true);
              extractMetricDefinitions()
                .catch((err) => {
                  notifications.toasts.addError(err, {
                    title: i18n.translate(
                      'xpack.inventory.datasetMetricsview.failedToExtractMetricsErrorMessage',
                      {
                        defaultMessage: 'Failed to extract metrics from dataset',
                      }
                    ),
                  });
                })
                .finally(() => {
                  setMetricExtractionLoading(false);
                });
            }}
            fill
            iconType="sparkles"
          >
            {i18n.translate('xpack.inventory.datasetMetricsview.suggestMetricsButtonLabel', {
              defaultMessage: 'Extract metric definitions',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiCallOut>
      {metricDefinitionSuggestions?.result?.description ? (
        <EuiPanel hasBorder>
          <EuiMarkdownFormat>{metricDefinitionSuggestions.result.description}</EuiMarkdownFormat>
        </EuiPanel>
      ) : null}
      {metricDefinitionSuggestions?.result?.metrics.length ? (
        <EuiFlexGrid columns={3}>
          {metricDefinitionSuggestions.result.metrics.map((suggestion) => {
            let aggregations: string = 'metric = ';

            switch (suggestion.metric.type) {
              case 'avg':
                aggregations += `AVG(${suggestion.metric.field})`;
                break;

              case 'count':
                aggregations += `COUNT(*)`;
                break;

              case 'sum':
                aggregations += `SUM(${suggestion.metric.field})`;
                break;

              case 'count_distinct':
                aggregations += `COUNT_DISTINCT(${suggestion.metric.field})`;
                break;

              case 'min':
                aggregations += `MIN(${suggestion.metric.field})`;
                break;

              case 'max':
                aggregations += `MAX(${suggestion.metric.field})`;
                break;

              case 'percentile':
                aggregations += `PERCENTILE(${suggestion.metric.field}, ${suggestion.metric.percentile})`;
                break;

              case 'weighted_avg':
                aggregations += `WEIGHTED_AVG(${suggestion.metric.field}, ${suggestion.metric.by})`;
                break;
            }
            const esqlQuery = `FROM "${id}" | WHERE @timestamp >= NOW() - 60 minutes AND @timestamp <= NOW() | STATS ${aggregations} BY @timestamp = BUCKET(@timestamp, 1 minute)${
              suggestion.metric.grouping ? `, ${suggestion.metric.grouping}` : ''
            } | SORT metric DESC`;

            return (
              <EuiPanel hasBorder key={suggestion.metric.label}>
                <EuiFlexGroup direction="column">
                  <EuiTitle size="s">
                    <h4>{suggestion.metric.label}</h4>
                  </EuiTitle>
                  <UncontrolledEsqlChart
                    query={esqlQuery}
                    height={200}
                    id={suggestion.metric.label}
                    metricNames={['metric']}
                  />
                </EuiFlexGroup>
              </EuiPanel>
            );
          })}
        </EuiFlexGrid>
      ) : null}
    </>
  );
}
