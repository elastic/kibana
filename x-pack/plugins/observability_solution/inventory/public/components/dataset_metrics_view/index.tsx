/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { useKibana } from '../../hooks/use_kibana';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { ErrorCallOut } from '../error_call_out';
import { LoadingPanel } from '../loading_panel';
import { MetricDefinition } from '../../../common/metrics';

export function DatasetMetricsView() {
  const {
    path: { id },
  } = useInventoryParams('/dataset/{id}/metrics');

  const {
    core: { notifications },
    services: { inventoryAPIClient },
  } = useKibana();

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

  const [metricDefinitionSuggestions, setMetricDefinitionSuggestions] = useState<
    MetricDefinition[]
  >([]);

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
            setMetricDefinitionSuggestions(event.data.process.result ?? []);
          },
          complete: () => {
            resolve();
          },
          error: (err) => {
            reject(err);
          },
        });
    });
  }, [id, inventoryAPIClient, fetchMetricDefinitionsController.signal]);

  if (error) {
    return <ErrorCallOut error={error} />;
  }

  if (loading) {
    return <LoadingPanel size="xl" loading={true} />;
  }

  if (!value?.metrics.length) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.inventory.datasetMetricsView.noMetricsCalloutTitle', {
          defaultMessage: 'No metrics defined',
        })}
      >
        <EuiFlexGroup direction="column" alignItems="flexStart">
          <EuiText>
            {i18n.translate('xpack.inventory.datasetMetricsView.noMetricsCalloutContent', {
              defaultMessage:
                'No metrics have been defined for this dataset. Defined metrics help us understand how to visualize your data. Do you want to automatically extract metrics from this dataset?',
            })}
          </EuiText>
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
    );
  }

  return <></>;
}
