/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import { useAbortController } from '@kbn/observability-utils/hooks/use_abort_controller';
import {
  EuiBadge,
  EuiButton,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiProgress,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useTheme } from '@kbn/observability-utils/hooks/use_theme';
import { groupBy } from 'lodash';
import { css } from '@emotion/css';
import { useKibana } from '../../hooks/use_kibana';

export function ServiceExtractionList({ indexPatterns }: { indexPatterns: string[] }) {
  const {
    dependencies: {
      start: {},
    },
    services: { callInventoryApi },
  } = useKibana();

  const theme = useTheme();

  const { value, loading, error } = useAbortableAsync(
    ({ signal }) => {
      return Promise.all([
        callInventoryApi('POST /internal/inventory/service_definitions', {
          signal,
          params: {
            body: {
              indexPatterns,
            },
          },
        }),
        callInventoryApi('GET /internal/inventory/datasets', {
          signal,
          params: {
            query: {
              indexPatterns: indexPatterns.join(','),
            },
          },
        }),
      ]);
    },
    [indexPatterns, callInventoryApi]
  );

  const { signal, refresh: refreshAbortController } = useAbortController();

  const [progress, setProgress] = useState({ loading: false, completed: 0, total: 0 });

  const [candidates, setCandidates] = useState<
    Array<{ field: string; dataset: string; terms: string[]; accept: boolean }>
  >([]);

  const groupedCandidates = useMemo(() => {
    return groupBy(candidates, (candidate) => candidate.field);
  }, [candidates]);

  if (loading || !value) {
    return <EuiLoadingSpinner size="s" />;
  }

  const [{ serviceDefinitions, datasetsWithUncoveredData }, { datasets }] = value;

  const extractServicesButton = !!datasetsWithUncoveredData.length ? (
    <EuiButton
      data-test-subj="inventoryServiceExtractionListExtractServiceDefinitionsButton"
      color="primary"
      fullWidth={false}
      iconType="sparkles"
      isLoading={progress.loading}
      disabled={progress.loading}
      onClick={() => {
        setCandidates(() => []);
        setProgress(() => ({ loading: true, total: datasets.length, completed: 0 }));
        callInventoryApi('POST /internal/inventory/service_definitions/extract', {
          signal,
          params: {
            body: {
              datasets: datasets.map((dataset) => dataset.name),
              connectorId: 'azure-gpt4o',
            },
          },
          asEventSourceStream: true,
        }).subscribe({
          complete: () => {
            setProgress((prev) => ({ ...prev, loading: false }));
            refreshAbortController();
          },
          error: () => {
            setProgress((prev) => ({ ...prev, loading: false }));
            refreshAbortController();
          },
          next: (event) => {
            setCandidates((prev) => {
              return prev.concat(
                event.output.candidates.map((candidate, index) => ({
                  ...candidate,
                  dataset: event.output.dataset,
                  accept: index === 0,
                }))
              );
            });
            setProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
          },
        });
      }}
    >
      {i18n.translate(
        'xpack.inventory.serviceExtractionList.extractServiceDefinitionsButtonLabel',
        {
          defaultMessage:
            'Extract service definitions for {datasetCount, plural, one {# dataset} other {# datasets}}',
          values: {
            datasetCount: datasets.length,
          },
        }
      )}
    </EuiButton>
  ) : null;

  const progressBar = progress.loading ? (
    <EuiProgress value={progress.completed} max={progress.total} />
  ) : null;

  const proposalList = candidates.length ? (
    <EuiFlexGroup
      direction="column"
      className={css`
        align-self: stretch;
      `}
    >
      {Object.entries(groupedCandidates).map(([group, candidatesForGroup]) => (
        <EuiFlexGroup direction="column" key={group} gutterSize="s">
          <EuiTitle size="xs">
            <h3>
              <EuiCode>{group}</EuiCode>
            </h3>
          </EuiTitle>
          <EuiHorizontalRule margin="none" />
          <EuiFlexGroup direction="column" gutterSize="xs">
            {candidatesForGroup.map((candidate) => (
              <EuiFlexGroup direction="row" gutterSize="s" key={candidate.dataset}>
                <EuiFlexItem
                  grow={false}
                  className={css`
                    width: 256px;
                    white-space: wrap;
                    word-break: break-all;
                  `}
                >
                  <EuiTitle size="xxs">
                    <h4>{candidate.dataset}</h4>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow>
                  <EuiFlexGroup
                    direction="row"
                    justifyContent="flexStart"
                    alignItems="center"
                    wrap
                    gutterSize="xs"
                  >
                    {candidate.terms.map((term) => (
                      <EuiBadge key={term} color="hollow">
                        {term}
                      </EuiBadge>
                    ))}
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    checked={candidate.accept}
                    onChange={() => {}}
                    showLabel={false}
                    label={i18n.translate(
                      'xpack.inventory.proposalList.acceptProposalSwitchLabel',
                      {
                        defaultMessage: 'Accept proposal',
                      }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
          </EuiFlexGroup>
        </EuiFlexGroup>
      ))}
    </EuiFlexGroup>
  ) : null;

  if (!serviceDefinitions.length) {
    return (
      <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart">
        <EuiText size="s" color={theme.colors.primaryText}>
          {i18n.translate('xpack.inventory.serviceExtractionList.noServiceDefinitionsLabel', {
            defaultMessage: 'No service definitions exist for these datasets.',
          })}
        </EuiText>
        {extractServicesButton}
        {progressBar}
        {proposalList}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column">
      {serviceDefinitions.map((definition) => {
        return <EuiText size="s">{definition.field}</EuiText>;
      })}
    </EuiFlexGroup>
  );
}
