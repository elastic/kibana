/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { CATALOG_SEVERITIES, type CatalogSeverity } from '../common/catalog_filters';
import type {
  CatalogRepositorySummary,
  ExtractionBatchStatus,
  Repository,
  RepositoryExtractionStatus,
} from './api';
import { deleteRepository, getBatch, getCatalogSummary, startBatch } from './api';
import { describeStartError, type StartErrorDescription } from './describe_start_error';
import { RepositoryFlyout } from './repository_flyout';
import { severityLabels, useSeverityColors } from './severity_badge';

interface Props {
  http: HttpSetup;
  repositories: Repository[];
  loading: boolean;
  error?: string;
  reload: () => void;
  onViewCatalog: (repository: string, severity?: CatalogSeverity) => void;
}

/** Longer than the catalog index refresh interval (1 second by default). */
const SUMMARY_SETTLE_DELAY_MS = 3000;

type HealthColor = 'success' | 'danger' | 'warning' | 'primary' | 'subdued';

type RepositoryStatus = RepositoryExtractionStatus['status'] | 'ready' | 'disabled';

const repositoryStatusLabels: Record<RepositoryStatus, string> = {
  ready: i18n.translate('xpack.codeIntelligence.repositories.statusReady', {
    defaultMessage: 'Ready',
  }),
  disabled: i18n.translate('xpack.codeIntelligence.repositories.statusDisabled', {
    defaultMessage: 'Disabled',
  }),
  pending: i18n.translate('xpack.codeIntelligence.repositories.statusPending', {
    defaultMessage: 'Waiting',
  }),
  running: i18n.translate('xpack.codeIntelligence.repositories.statusRunning', {
    defaultMessage: 'Running',
  }),
  completed: i18n.translate('xpack.codeIntelligence.repositories.statusCompleted', {
    defaultMessage: 'Completed',
  }),
  failed: i18n.translate('xpack.codeIntelligence.repositories.statusFailed', {
    defaultMessage: 'Failed',
  }),
};

const batchStatusLabels: Record<ExtractionBatchStatus['status'], string> = {
  running: i18n.translate('xpack.codeIntelligence.repositories.batchRunning', {
    defaultMessage: 'Running',
  }),
  completed: i18n.translate('xpack.codeIntelligence.repositories.batchCompleted', {
    defaultMessage: 'Completed',
  }),
  failed: i18n.translate('xpack.codeIntelligence.repositories.batchFailed', {
    defaultMessage: 'Failed',
  }),
  partial: i18n.translate('xpack.codeIntelligence.repositories.batchPartial', {
    defaultMessage: 'Partially completed',
  }),
};

const statusColor = (status: RepositoryStatus | ExtractionBatchStatus['status']): HealthColor =>
  status === 'completed'
    ? 'success'
    : status === 'failed'
    ? 'danger'
    : status === 'partial'
    ? 'warning'
    : status === 'pending' || status === 'disabled'
    ? 'subdued'
    : 'primary';

/** Batch statuses apply only while the batch runs; otherwise the stored state decides. */
const repositoryStatus = (
  enabled: boolean,
  live: RepositoryExtractionStatus | undefined,
  batchRunning: boolean,
  /** Absent while the catalog counts are loading or could not be loaded. */
  entryCount: number | undefined
): RepositoryStatus | undefined => {
  if (batchRunning && live !== undefined && live.status !== 'completed') return live.status;
  if (!enabled) return 'disabled';
  if (entryCount === undefined) return undefined;
  return entryCount > 0 ? 'completed' : 'ready';
};

export const RepositoriesView = ({
  http,
  repositories,
  loading,
  error,
  reload,
  onViewCatalog,
}: Props) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batch, setBatch] = useState<ExtractionBatchStatus>();
  /** Absent until loaded, or when the counts could not be loaded. */
  const [summaries, setSummaries] = useState<Map<string, CatalogRepositorySummary>>();
  const severityColors = useSeverityColors();
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<StartErrorDescription>();
  const [following, setFollowing] = useState(false);
  /** Open when set; `editing` is absent when adding a repository. */
  const [flyout, setFlyout] = useState<{ editing?: Repository }>();
  const [pendingDelete, setPendingDelete] = useState<Repository>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const deleteTitleId = useGeneratedHtmlId({ prefix: 'codeIntelligenceDeleteTitle' });

  const runningBatchId = batch?.status === 'running' ? batch.id : undefined;

  useEffect(() => {
    if (runningBatchId === undefined) return;
    const interval = window.setInterval(() => {
      void getBatch(http, runningBatchId).then(
        (status) => setBatch((current) => (current?.id === status.id ? status : current)),
        () => undefined
      );
    }, 2000);
    return () => window.clearInterval(interval);
  }, [http, runningBatchId]);

  const settledBatchId = batch !== undefined && batch.status !== 'running' ? batch.id : undefined;

  useEffect(() => {
    let active = true;
    const load = () =>
      void getCatalogSummary(http).then(
        (result) => {
          if (active) setSummaries(new Map(result.map((entry) => [entry.repository, entry])));
        },
        () => {
          if (active) setSummaries(undefined);
        }
      );
    load();
    // Catalog writes do not wait for a refresh, so a batch can settle before its entries are searchable.
    const timeout =
      settledBatchId === undefined ? undefined : window.setTimeout(load, SUMMARY_SETTLE_DELAY_MS);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [http, repositories, settledBatchId]);

  const selected = useMemo(
    () => repositories.filter(({ repository }) => selectedIds.includes(repository)),
    [repositories, selectedIds]
  );

  const runBatch = useCallback(async () => {
    setStarting(true);
    setActionError(undefined);
    try {
      const { id } = await startBatch(
        http,
        selected.length === 0 ? undefined : selected.map(({ repository }) => ({ repository }))
      );
      setBatch(await getBatch(http, id));
    } catch (startError) {
      setActionError(describeStartError(startError));
    } finally {
      setStarting(false);
    }
  }, [http, selected]);

  const followBatch = useCallback(
    async (extractionId: string) => {
      setFollowing(true);
      try {
        setBatch(await getBatch(http, extractionId));
        setActionError(undefined);
      } catch {
        // The suggestions still apply when the batch can no longer be fetched.
        setActionError((current) =>
          current?.extractionId === extractionId ? { ...current, extractionId: undefined } : current
        );
      } finally {
        setFollowing(false);
      }
    },
    [http]
  );

  const confirmDelete = useCallback(async () => {
    if (pendingDelete === undefined) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteRepository(http, pendingDelete.repository);
      setSelectedIds((current) => current.filter((id) => id !== pendingDelete.repository));
      if (flyout?.editing?.repository === pendingDelete.repository) setFlyout(undefined);
      setPendingDelete(undefined);
      reload();
    } catch {
      setDeleteError(
        i18n.translate('xpack.codeIntelligence.repositories.deleteFailed', {
          defaultMessage: '{repository} could not be deleted.',
          values: { repository: pendingDelete.repository },
        })
      );
      setPendingDelete(undefined);
    } finally {
      setDeleting(false);
    }
  }, [flyout, http, pendingDelete, reload]);

  const columns = useMemo<Array<EuiBasicTableColumn<Repository>>>(
    () => [
      {
        field: 'repository',
        name: i18n.translate('xpack.codeIntelligence.repositories.repositoryColumn', {
          defaultMessage: 'Repository',
        }),
        width: '28%',
      },
      {
        name: i18n.translate('xpack.codeIntelligence.repositories.catalogColumn', {
          defaultMessage: 'Catalog entries',
        }),
        width: '28%',
        render: ({ repository }: Repository) => {
          if (summaries === undefined) return <EuiText size="s">—</EuiText>;
          const counts = summaries.get(repository);
          return (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
              {[...CATALOG_SEVERITIES].reverse().map((level) => {
                const count = counts?.severities[level] ?? 0;
                return (
                  <EuiFlexItem grow={false} key={level}>
                    <EuiBadge
                      color={severityColors[level]}
                      title={severityLabels[level]}
                      data-test-subj={`codeIntelligenceSeverityCount-${repository}-${level}`}
                      onClick={() => onViewCatalog(repository, level)}
                      onClickAriaLabel={i18n.translate(
                        'xpack.codeIntelligence.repositories.severityCountAriaLabel',
                        {
                          defaultMessage: 'View {severity} entries for {repository} in the catalog',
                          values: { severity: severityLabels[level], repository },
                        }
                      )}
                    >
                      {count}
                    </EuiBadge>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          );
        },
      },
      {
        name: i18n.translate('xpack.codeIntelligence.repositories.revisionColumn', {
          defaultMessage: 'Revision',
        }),
        width: '120px',
        render: ({ repository, defaultRef }: Repository) => (
          <EuiBadge color="hollow" data-test-subj={`codeIntelligenceRevision-${repository}`}>
            {defaultRef}
          </EuiBadge>
        ),
      },
      {
        name: i18n.translate('xpack.codeIntelligence.repositories.statusColumn', {
          defaultMessage: 'Status',
        }),
        render: ({ repository, enabled }: Repository) => {
          const live = batch?.repositories.find((entry) => entry.repository === repository);
          const status = repositoryStatus(
            enabled,
            live,
            batch?.status === 'running',
            summaries === undefined ? undefined : summaries.get(repository)?.total ?? 0
          );
          return (
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem grow={false}>
                {status === undefined ? (
                  <EuiText
                    size="s"
                    data-test-subj={`codeIntelligenceRepositoryStatus-${repository}`}
                  >
                    —
                  </EuiText>
                ) : (
                  <EuiHealth
                    color={statusColor(status)}
                    data-test-subj={`codeIntelligenceRepositoryStatus-${repository}`}
                  >
                    {repositoryStatusLabels[status]}
                  </EuiHealth>
                )}
              </EuiFlexItem>
              {live !== undefined && live.errors.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="danger">
                    {live.errors.join('; ')}
                  </EuiText>
                </EuiFlexItem>
              )}
              {live !== undefined && live.warnings.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="warning">
                    {live.warnings.join('; ')}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      {
        name: i18n.translate('xpack.codeIntelligence.repositories.actionsColumn', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: i18n.translate('xpack.codeIntelligence.repositories.editAction', {
              defaultMessage: 'Edit',
            }),
            description: i18n.translate(
              'xpack.codeIntelligence.repositories.editActionDescription',
              { defaultMessage: 'Edit this repository' }
            ),
            icon: 'pencil',
            type: 'icon',
            'data-test-subj': 'codeIntelligenceEditRepository',
            onClick: (repository) => setFlyout({ editing: repository }),
          },
          {
            name: i18n.translate('xpack.codeIntelligence.repositories.deleteAction', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate(
              'xpack.codeIntelligence.repositories.deleteActionDescription',
              { defaultMessage: 'Delete this repository' }
            ),
            icon: 'trash',
            type: 'icon',
            color: 'danger',
            'data-test-subj': 'codeIntelligenceDeleteRepository',
            onClick: (repository) => setPendingDelete(repository),
          },
        ],
      },
    ],
    [batch, onViewCatalog, severityColors, summaries]
  );

  if (loading) return <EuiLoadingSpinner size="xl" />;
  if (error !== undefined) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={
          <h2>
            {i18n.translate('xpack.codeIntelligence.repositories.loadErrorTitle', {
              defaultMessage: 'Repositories could not be loaded',
            })}
          </h2>
        }
        body={<p>{error}</p>}
        actions={
          <EuiButton
            data-test-subj="codeIntelligenceRepositoriesRetryButton"
            color="danger"
            onClick={reload}
          >
            {i18n.translate('xpack.codeIntelligence.repositories.retry', {
              defaultMessage: 'Retry',
            })}
          </EuiButton>
        }
      />
    );
  }

  const addButton = (
    <EuiButton
      data-test-subj="codeIntelligenceAddRepositoryButton"
      iconType="plusCircle"
      fill
      onClick={() => setFlyout({})}
    >
      {i18n.translate('xpack.codeIntelligence.repositories.addRepository', {
        defaultMessage: 'Add repository',
      })}
    </EuiButton>
  );

  return (
    <>
      {actionError !== undefined && (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="error"
            data-test-subj="codeIntelligenceStartErrorCallout"
            title={actionError.title}
            onDismiss={() => setActionError(undefined)}
          >
            <EuiText size="s">
              <p>{actionError.explanation}</p>
              <p>
                <strong>
                  {i18n.translate(
                    'xpack.codeIntelligence.repositories.startError.suggestionsTitle',
                    { defaultMessage: 'What you can do' }
                  )}
                </strong>
              </p>
              <ul>
                {actionError.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </EuiText>
            {actionError.extractionId !== undefined && (
              <>
                <EuiSpacer size="s" />
                <EuiButton
                  data-test-subj="codeIntelligenceFollowRunButton"
                  color="danger"
                  size="s"
                  isLoading={following}
                  onClick={() =>
                    actionError.extractionId !== undefined &&
                    void followBatch(actionError.extractionId)
                  }
                >
                  {i18n.translate('xpack.codeIntelligence.repositories.startError.followRun', {
                    defaultMessage: 'Follow that batch',
                  })}
                </EuiButton>
              </>
            )}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      {deleteError !== undefined && (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="error"
            size="s"
            data-test-subj="codeIntelligenceDeleteErrorCallout"
            title={deleteError}
            onDismiss={() => setDeleteError(undefined)}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {repositories.length === 0 ? (
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate('xpack.codeIntelligence.repositories.emptyTitle', {
                defaultMessage: 'No repositories configured',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.codeIntelligence.repositories.emptyBody', {
                defaultMessage: 'Add a repository to run extraction.',
              })}
            </p>
          }
          actions={addButton}
        />
      ) : (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>{addButton}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="codeIntelligenceRunBatchButton"
                iconType="play"
                isLoading={starting}
                isDisabled={runningBatchId !== undefined}
                onClick={() => void runBatch()}
              >
                {selected.length === 0
                  ? i18n.translate('xpack.codeIntelligence.repositories.runAllEnabled', {
                      defaultMessage: 'Run all enabled repositories',
                    })
                  : i18n.translate('xpack.codeIntelligence.repositories.runSelected', {
                      defaultMessage:
                        'Run {count, plural, one {# selected repository} other {# selected repositories}}',
                      values: { count: selected.length },
                    })}
              </EuiButton>
            </EuiFlexItem>
            {batch !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiHealth
                  color={statusColor(batch.status)}
                  data-test-subj="codeIntelligenceBatchStatus"
                >
                  {i18n.translate('xpack.codeIntelligence.repositories.batchSummary', {
                    defaultMessage: 'Batch started {startedAt}: {status}',
                    values: {
                      startedAt: batch.startedAt,
                      status: batchStatusLabels[batch.status],
                    },
                  })}
                </EuiHealth>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiBasicTable
            tableCaption={i18n.translate('xpack.codeIntelligence.repositories.tableCaption', {
              defaultMessage: 'Configured code repositories',
            })}
            items={repositories}
            itemId="repository"
            columns={columns}
            rowHeader="repository"
            selection={{
              selected,
              onSelectionChange: (items: Repository[]) =>
                setSelectedIds(items.map(({ repository }) => repository)),
            }}
            loading={starting}
          />
        </>
      )}
      {flyout !== undefined && (
        <RepositoryFlyout
          http={http}
          editing={flyout.editing}
          onSaved={() => {
            setFlyout(undefined);
            reload();
          }}
          onClose={() => setFlyout(undefined)}
        />
      )}
      {pendingDelete !== undefined && (
        <EuiConfirmModal
          aria-labelledby={deleteTitleId}
          titleProps={{ id: deleteTitleId }}
          title={i18n.translate('xpack.codeIntelligence.repositories.deleteConfirmTitle', {
            defaultMessage: 'Delete {repository}?',
            values: { repository: pendingDelete.repository },
          })}
          onCancel={() => setPendingDelete(undefined)}
          onConfirm={() => void confirmDelete()}
          isLoading={deleting}
          cancelButtonText={i18n.translate(
            'xpack.codeIntelligence.repositories.deleteConfirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.codeIntelligence.repositories.deleteConfirmButton',
            { defaultMessage: 'Delete' }
          )}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          data-test-subj="codeIntelligenceDeleteConfirmModal"
        >
          <p>
            {i18n.translate('xpack.codeIntelligence.repositories.deleteConfirmBody', {
              defaultMessage:
                'The repository is removed from the settings. Documents it already added to the catalog stay there.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
