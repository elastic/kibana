/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiPanel,
  EuiTitle,
  useDeepEqual,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import React, { useMemo, useState } from 'react';
import { v4 } from 'uuid';
import { keyBy } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { MetricDefinition } from '../../../common/metrics';
import { useKibana } from '../../hooks/use_kibana';
import { getMetricQuery } from '../../../common/utils/get_metric_query';

export function MetricDefinitionFlyout({
  metricDefinitions,
  onMetricDefinitionsUpdate,
  indexPatterns,
  onClose,
  displayName,
  type,
}: {
  metricDefinitions: MetricDefinition[];
  onMetricDefinitionsUpdate: (definitions: MetricDefinition[]) => Promise<void>;
  indexPatterns: string[];
  onClose: () => void;
  displayName: string;
  type: string;
}) {
  const {
    dependencies: {
      start: { dataViews, data },
    },
    services: { inventoryAPIClient },
  } = useKibana();

  const [nextDefinitions, setNextDefinitions] =
    useState<Array<Partial<MetricDefinition> & { id: string }>>(metricDefinitions);

  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const [displayErrors, setDisplayErrors] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const suggestedFieldNamesFetch = useAbortableAsync(
    async ({ signal }) => {
      if (!indexPatterns.length) {
        return [];
      }

      return dataViews
        .getFieldsForWildcard({
          pattern: indexPatterns.join(','),
          type: 'keyword',
          indexFilter: {
            bool: {
              filter: [...excludeFrozenQuery()],
            },
          },
          includeEmptyFields: false,
        })
        .then((specs) => {
          return specs
            .filter((spec) => spec.type === 'number')
            .map((spec) => ({ label: spec.name, value: spec.name }));
        });
    },
    [indexPatterns, dataViews]
  );

  function isValidDefinition(
    definition: Partial<MetricDefinition>
  ): definition is MetricDefinition {
    return !!definition.id && !!definition.displayName;
  }

  const isValid = nextDefinitions.every(isValidDefinition);

  const metricsWithoutDisplayName = useMemo(() => {
    return nextDefinitions.map((definition) => ({
      id: definition.id,
      filter: definition.filter,
      expression: definition.expression,
    }));
  }, [nextDefinitions]);

  const metricsToValidate = useDeepEqual(metricsWithoutDisplayName);

  const queryValidationsFetch = useAbortableAsync(
    async ({ signal }) => {
      const validations = await Promise.all(
        metricsToValidate.map((metric) => {
          const { query, kuery } = getMetricQuery({
            metric,
            indexPatterns,
          });
          return inventoryAPIClient
            .fetch('POST /internal/inventory/esql', {
              signal,
              params: {
                body: {
                  operationName: 'validate_metric_expression',
                  query: query + '| LIMIT 0',
                  kuery,
                  start,
                  end,
                },
              },
            })
            .then(() => {
              return {
                id: metric.id,
                valid: true,
              };
            })
            .catch((error) => {
              return {
                id: metric.id,
                valid: false,
                error,
              };
            });
        })
      );

      return keyBy(validations, (validation) => validation.id);
    },
    [metricsToValidate, start, end, indexPatterns, inventoryAPIClient]
  );

  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  return (
    <EuiFlyout onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.inventory.metricDefinitionFlyout.h2.metricDefinitionsLabel', {
              defaultMessage: 'Metric definitions',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          {nextDefinitions.length ? (
            <EuiFlexGroup direction="column" gutterSize="s">
              {nextDefinitions.map((definition) => {
                return (
                  <EuiPanel key={definition.id!} hasBorder hasShadow={false}>
                    <EuiFlexGroup direction="row">
                      <EuiFlexGroup direction="column" gutterSize="m">
                        <EuiFormRow
                          label={i18n.translate(
                            'xpack.inventory.metricDefinitionFlyout.displayNameLabel',
                            {
                              defaultMessage: 'Display name',
                            }
                          )}
                          fullWidth
                        >
                          <EuiFieldText
                            data-test-subj="inventoryMetricDefinitionFlyoutFieldText"
                            value={definition.displayName}
                            compressed
                            onChange={(event) => {
                              setNextDefinitions((prev) => {
                                return prev.map((def) => {
                                  if (def.id === definition.id) {
                                    return {
                                      ...def,
                                      displayName: event.target.value,
                                    };
                                  }
                                  return def;
                                });
                              });
                            }}
                            fullWidth
                          />
                        </EuiFormRow>
                        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                          <EuiFlexItem grow>
                            <EuiFormRow
                              label={i18n.translate(
                                'xpack.inventory.metricDefinitionFlyout.filterLabel',
                                {
                                  defaultMessage: 'Filter',
                                }
                              )}
                              fullWidth
                            >
                              <EuiFieldText
                                data-test-subj="inventoryMetricDefinitionFlyoutFieldText"
                                value={definition.filter}
                                compressed
                                fullWidth
                                onChange={(event) => {
                                  setNextDefinitions((prev) => {
                                    return prev.map((def) => {
                                      if (def.id === definition.id) {
                                        return {
                                          ...def,
                                          filter: event.target.value,
                                        };
                                      }
                                      return def;
                                    });
                                  });
                                }}
                              />
                            </EuiFormRow>
                          </EuiFlexItem>
                          <EuiFlexItem grow>
                            <EuiFormRow
                              label={i18n.translate(
                                'xpack.inventory.metricDefinitionFlyout.expressionLabel',
                                {
                                  defaultMessage: 'Expression (optional)',
                                }
                              )}
                              fullWidth
                            >
                              <EuiFieldText
                                data-test-subj="inventoryMetricDefinitionFlyoutFieldText"
                                value={definition.expression}
                                compressed
                                isInvalid={
                                  queryValidationsFetch?.value?.[definition.id]?.valid === false
                                }
                                onChange={(event) => {
                                  setNextDefinitions((prev) => {
                                    return prev.map((def) => {
                                      if (def.id === definition.id) {
                                        return {
                                          ...def,
                                          expression: event.target.value,
                                        };
                                      }
                                      return def;
                                    });
                                  });
                                }}
                                fullWidth
                              />
                            </EuiFormRow>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexGroup>
                      <EuiButtonEmpty
                        data-test-subj="inventoryMetricDefinitionFlyoutButton"
                        iconType="cross"
                        onClick={() => {
                          setNextDefinitions((prev) =>
                            prev.filter((metric) => metric.id !== definition.id)
                          );
                        }}
                      />
                    </EuiFlexGroup>
                  </EuiPanel>
                );
              })}
            </EuiFlexGroup>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
              <EuiButtonEmpty
                data-test-subj="inventoryMetricDefinitionFlyoutSuggestMetricsButton"
                iconType="sparkles"
                disabled={loadingSuggestions}
                isLoading={loadingSuggestions}
                onClick={() => {
                  setLoadingSuggestions(true);
                  lastValueFrom(
                    inventoryAPIClient.stream('POST /internal/inventory/metrics/suggest', {
                      signal: new AbortController().signal,
                      params: {
                        body: {
                          connectorId: 'azure-gpt4o',
                          indexPatterns,
                          entity: {
                            type,
                            displayName,
                          },
                          start,
                          end,
                        },
                      },
                    })
                  )
                    .then((response) => {
                      setNextDefinitions((prev) =>
                        prev.concat(
                          response.process.result?.metrics.map((metric) => {
                            return {
                              id: v4(),
                              displayName: metric.displayName,
                              expression: metric.expression,
                              filter: metric.filter,
                            };
                          }) ?? []
                        )
                      );
                    })
                    .finally(() => {
                      setLoadingSuggestions(false);
                    });
                }}
              >
                {i18n.translate(
                  'xpack.inventory.metricDefinitionFlyout.suggestMetricsButtonEmptyLabel',
                  { defaultMessage: 'Suggest metrics' }
                )}
              </EuiButtonEmpty>
              <EuiButton
                data-test-subj="inventoryMetricDefinitionFlyoutAddDefinitionButton"
                onClick={() => {
                  setNextDefinitions((prev) => prev.concat({ id: v4() }));
                }}
                iconType="plusInCircleFilled"
              >
                {i18n.translate('xpack.inventory.metricDefinitionFlyout.addDefinitionButtonLabel', {
                  defaultMessage: 'Add definition',
                })}
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup direction="row" justifyContent="flexEnd">
          <EuiButton
            data-test-subj="inventoryMetricDefinitionFlyoutButton"
            fill
            isDisabled={submitting || !isValid}
            onClick={() => {
              onMetricDefinitionsUpdate(nextDefinitions as MetricDefinition[]);
            }}
          >
            {i18n.translate('xpack.inventory.metricDefinitionFlyout.updateMetricDefinitions', {
              defaultMessage: 'Update metric definitions',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
