/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { ExtractionStatus, Repository } from './api';
import { getExtraction, startExtraction } from './api';

interface Props {
  http: HttpSetup;
  repositories: Repository[];
  loading: boolean;
  error?: string;
  reload: () => void;
}

const statusLabel = (status: ExtractionStatus['status']): string => {
  const labels = {
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
  return labels[status];
};

export const RepositoriesView = ({ http, repositories, loading, error, reload }: Props) => {
  const [revisions, setRevisions] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, ExtractionStatus>>({});
  const [starting, setStarting] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const runningIds = Object.values(statuses)
    .filter(({ status }) => status === 'running')
    .map(({ id }) => id)
    .sort()
    .join(',');

  useEffect(() => {
    if (runningIds.length === 0) return;
    const poll = async () => {
      const updates = await Promise.all(
        runningIds.split(',').map(async (id) => {
          try {
            return await getExtraction(http, id);
          } catch {
            return undefined;
          }
        })
      );
      setStatuses((current) => {
        const next = { ...current };
        updates.forEach((status) => {
          if (status !== undefined) next[status.repository] = status;
        });
        return next;
      });
    };
    const interval = window.setInterval(() => void poll(), 2000);
    return () => window.clearInterval(interval);
  }, [http, runningIds]);

  const runExtraction = useCallback(
    async (repository: string) => {
      const revision = (revisions[repository] ?? 'HEAD').trim().slice(0, 255);
      if (revision.length === 0) return;
      setStarting(repository);
      setActionError(undefined);
      try {
        const { id } = await startExtraction(http, repository.slice(0, 256), revision);
        const status = await getExtraction(http, id);
        setStatuses((current) => ({ ...current, [repository]: status }));
      } catch {
        setActionError(
          i18n.translate('xpack.codeIntelligence.repositories.runError', {
            defaultMessage: 'The extraction could not be started.',
          })
        );
      } finally {
        setStarting(undefined);
      }
    },
    [http, revisions]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<Repository>>>(
    () => [
      {
        field: 'repository',
        name: i18n.translate('xpack.codeIntelligence.repositories.repositoryColumn', {
          defaultMessage: 'Repository',
        }),
      },
      {
        name: i18n.translate('xpack.codeIntelligence.repositories.revisionColumn', {
          defaultMessage: 'Revision',
        }),
        render: ({ repository }: Repository) => (
          <EuiFieldText
            data-test-subj={`codeIntelligenceRevision-${repository}`}
            compressed
            value={revisions[repository] ?? 'HEAD'}
            maxLength={255}
            aria-label={i18n.translate('xpack.codeIntelligence.repositories.revisionLabel', {
              defaultMessage: 'Revision for {repository}',
              values: { repository },
            })}
            onChange={(event) =>
              setRevisions((current) => ({
                ...current,
                [repository]: event.target.value.slice(0, 255),
              }))
            }
          />
        ),
      },
      {
        name: i18n.translate('xpack.codeIntelligence.repositories.lastRunColumn', {
          defaultMessage: 'Current or last run',
        }),
        render: ({ repository }: Repository) => {
          const status = statuses[repository];
          if (status === undefined) {
            return (
              <EuiText size="s">
                {i18n.translate('xpack.codeIntelligence.repositories.notRun', {
                  defaultMessage: 'Not run in this session',
                })}
              </EuiText>
            );
          }
          return (
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiHealth
                  color={
                    status.status === 'completed'
                      ? 'success'
                      : status.status === 'failed'
                      ? 'danger'
                      : 'primary'
                  }
                >
                  {statusLabel(status.status)}
                </EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  {i18n.translate('xpack.codeIntelligence.repositories.runStarted', {
                    defaultMessage: 'Started {startedAt}',
                    values: { startedAt: status.startedAt },
                  })}
                </EuiText>
              </EuiFlexItem>
              {status.errors.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="danger">
                    {status.errors.join('; ')}
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
            name: i18n.translate('xpack.codeIntelligence.repositories.runAction', {
              defaultMessage: 'Run extraction',
            }),
            description: i18n.translate(
              'xpack.codeIntelligence.repositories.runActionDescription',
              { defaultMessage: 'Run extraction for this repository' }
            ),
            icon: 'play',
            type: 'icon',
            isPrimary: true,
            enabled: ({ repository }) =>
              starting !== repository && statuses[repository]?.status !== 'running',
            onClick: ({ repository }) => void runExtraction(repository),
          },
        ],
      },
    ],
    [revisions, runExtraction, starting, statuses]
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
  if (repositories.length === 0) {
    return (
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
              defaultMessage: 'Configure a repository to run code intelligence extraction.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <>
      {actionError !== undefined && (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          title={actionError}
          onDismiss={() => setActionError(undefined)}
        />
      )}
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.codeIntelligence.repositories.tableCaption', {
          defaultMessage: 'Configured code repositories',
        })}
        items={repositories}
        columns={columns}
        rowHeader="repository"
        loading={starting !== undefined}
      />
    </>
  );
};
