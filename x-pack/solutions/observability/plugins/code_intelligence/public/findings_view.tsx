/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';

import { CATALOG_SIGNAL_TYPES, type CatalogSignalType } from '../common/catalog_filters';
import { FINDING_STATUSES, type FindingStatus } from '../common/finding_filters';
import { InvestigateFindingButtonIcon } from './agent_builder/investigate_finding_context';
import type { FindingsPageContext } from './agent_builder/page_context';
import type { FindingItem, FindingsResponse, Repository } from './api';
import { getFindings } from './api';
import { CatalogFilterPopover } from './catalog_filter_popover';
import { FindingStatusBadge, FindingTypeBadge, findingStatusLabels } from './finding_badges';
import { FindingFlyout } from './finding_flyout';
import { SignalTypeBadge, signalTypeLabels } from './signal_type_badge';

interface Props {
  http: HttpSetup;
  repositories: Repository[];
  repositoriesLoading: boolean;
  repositoriesError?: string;
  reloadRepositories: () => void;
  /** Reports the filters, total, and open finding, for the AI Agent page context. */
  onContextChange?: (context: FindingsPageContext) => void;
}

/** Statuses change from the AI Agent sidebar, so the list needs a way to reload in place. */
const refreshLabel = i18n.translate('xpack.codeIntelligence.findings.refresh', {
  defaultMessage: 'Refresh findings',
});

/** `path:line` of the first evidence entry, the way the catalog row shows its query. */
export const firstEvidenceLocation = (item: FindingItem): string | undefined => {
  const first = item.evidence?.[0];
  if (first?.path === undefined) return undefined;
  return first.line === undefined ? first.path : `${first.path}:${first.line}`;
};

const FindingRow = ({ item, onOpen }: { item: FindingItem; onOpen: () => void }) => {
  const location = firstEvidenceLocation(item);
  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      onClick={onOpen}
      data-test-subj="codeIntelligenceFindingRow"
      aria-label={i18n.translate('xpack.codeIntelligence.findings.openFinding', {
        defaultMessage: 'Open {title}',
        values: { title: item.title ?? item.id },
      })}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <FindingTypeBadge findingType={item.finding_type} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FindingStatusBadge status={item.status} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SignalTypeBadge signalType={item.signal_type} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {item.repository}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <InvestigateFindingButtonIcon finding={item} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <strong>{item.title ?? '—'}</strong>
      </EuiText>
      {item.summary !== undefined && item.summary.trim() !== '' && (
        <EuiText
          size="xs"
          color="subdued"
          className="eui-textTruncate"
          data-test-subj="codeIntelligenceFindingRowSummary"
        >
          {item.summary}
        </EuiText>
      )}
      {location !== undefined && (
        <>
          <EuiSpacer size="xs" />
          <div className="eui-textTruncate">
            <EuiCode transparentBackground data-test-subj="codeIntelligenceFindingRowLocation">
              {location}
            </EuiCode>
          </div>
        </>
      )}
    </EuiPanel>
  );
};

export const FindingsView = ({
  http,
  repositories,
  repositoriesLoading,
  repositoriesError,
  reloadRepositories,
  onContextChange,
}: Props) => {
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<FindingStatus[]>(['open']);
  const [kinds, setKinds] = useState<CatalogSignalType[]>([]);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<FindingsResponse>();
  const [selected, setSelected] = useState<FindingItem>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [requestSequence, setRequestSequence] = useState(0);

  useEffect(() => {
    if (repositoriesLoading || repositories.length === 0) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    void getFindings(http, {
      repositories: selectedRepositories,
      statuses,
      kinds,
      ...(query === '' ? {} : { q: query.slice(0, 512) }),
      page: Math.min(Math.max(page, 1), 100),
    })
      .then((result) => {
        if (active) setResponse(result);
      })
      .catch(() => {
        if (active) {
          setResponse(undefined);
          setError(
            i18n.translate('xpack.codeIntelligence.findings.loadError', {
              defaultMessage: 'The findings could not be loaded.',
            })
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    http,
    kinds,
    page,
    query,
    repositories.length,
    repositoriesLoading,
    requestSequence,
    selectedRepositories,
    statuses,
  ]);

  const total = response?.total;
  useEffect(() => {
    onContextChange?.({
      tab: 'findings',
      repositories: selectedRepositories,
      statuses,
      signalTypes: kinds,
      search: query,
      ...(total === undefined ? {} : { total }),
      ...(selected === undefined
        ? {}
        : {
            selectedFinding: {
              id: selected.id,
              repository: selected.repository,
              title: selected.title,
              finding_type: selected.finding_type,
              status: selected.status,
              signal_type: selected.signal_type,
            },
          }),
    });
  }, [kinds, onContextChange, query, selected, selectedRepositories, statuses, total]);

  if (!repositoriesLoading && repositoriesError !== undefined) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={<h2>{repositoriesError}</h2>}
        actions={
          <EuiButton
            data-test-subj="codeIntelligenceFindingsRepositoriesRetryButton"
            color="danger"
            onClick={reloadRepositories}
          >
            {i18n.translate('xpack.codeIntelligence.findings.repositoriesRetry', {
              defaultMessage: 'Retry',
            })}
          </EuiButton>
        }
      />
    );
  }

  if (!repositoriesLoading && repositories.length === 0) {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            {i18n.translate('xpack.codeIntelligence.findings.repositoryRequiredTitle', {
              defaultMessage: 'A repository is required',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.codeIntelligence.findings.repositoryRequiredBody', {
              defaultMessage: 'Configure and extract a repository before reviewing findings.',
            })}
          </p>
        }
      />
    );
  }

  const pageCount = Math.min(100, Math.ceil((response?.total ?? 0) / 25));
  const items = response?.items ?? [];

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem css={{ minWidth: 240 }}>
          <EuiFieldSearch
            data-test-subj="codeIntelligenceFindingsQueryFilter"
            placeholder={i18n.translate('xpack.codeIntelligence.findings.queryPlaceholder', {
              defaultMessage: 'Search titles, summaries, and file paths',
            })}
            aria-label={i18n.translate('xpack.codeIntelligence.findings.queryFilter', {
              defaultMessage: 'Search findings',
            })}
            fullWidth
            value={queryInput}
            maxLength={512}
            onChange={(event) => setQueryInput(event.target.value.slice(0, 512))}
            onSearch={(value) => {
              setPage(1);
              setQuery(value.trim().slice(0, 512));
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <CatalogFilterPopover
              filter="findingRepository"
              title={i18n.translate('xpack.codeIntelligence.findings.repositoryFilter', {
                defaultMessage: 'Repository',
              })}
              searchable
              width={360}
              disabled={repositoriesLoading}
              options={repositories.map(({ repository }) => ({
                value: repository,
                label: repository,
              }))}
              selected={selectedRepositories}
              onChange={(next) => {
                setSelectedRepositories(next);
                setPage(1);
              }}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <CatalogFilterPopover
              filter="findingStatus"
              title={i18n.translate('xpack.codeIntelligence.findings.statusFilter', {
                defaultMessage: 'Status',
              })}
              options={FINDING_STATUSES.map((value) => ({
                value,
                label: findingStatusLabels[value],
              }))}
              selected={statuses}
              onChange={(next) => {
                setStatuses(next);
                setPage(1);
              }}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <CatalogFilterPopover
              filter="findingKind"
              title={i18n.translate('xpack.codeIntelligence.findings.kindFilter', {
                defaultMessage: 'Kind',
              })}
              options={CATALOG_SIGNAL_TYPES.map((value) => ({
                value,
                label: signalTypeLabels[value],
              }))}
              selected={kinds}
              onChange={(next) => {
                setKinds(next);
                setPage(1);
              }}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={refreshLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              display="base"
              size="m"
              iconType="refresh"
              aria-label={refreshLabel}
              isDisabled={loading}
              data-test-subj="codeIntelligenceFindingsRefreshButton"
              onClick={() => setRequestSequence((value) => value + 1)}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      {error !== undefined ? (
        <EuiEmptyPrompt
          color="danger"
          iconType="error"
          title={<h2>{error}</h2>}
          actions={
            <EuiButton
              data-test-subj="codeIntelligenceFindingsRetryButton"
              color="danger"
              onClick={() => setRequestSequence((value) => value + 1)}
            >
              {i18n.translate('xpack.codeIntelligence.findings.retry', {
                defaultMessage: 'Retry',
              })}
            </EuiButton>
          }
        />
      ) : (
        <>
          {loading && <EuiProgress size="xs" color="accent" />}
          {items.length === 0 ? (
            !loading && (
              <EuiText
                size="s"
                color="subdued"
                textAlign="center"
                data-test-subj="codeIntelligenceFindingsEmpty"
              >
                <p>
                  {i18n.translate('xpack.codeIntelligence.findings.emptyMessage', {
                    defaultMessage: 'No findings match these filters.',
                  })}
                </p>
              </EuiText>
            )
          ) : (
            <EuiFlexGroup
              component="ul"
              direction="column"
              gutterSize="s"
              aria-label={i18n.translate('xpack.codeIntelligence.findings.listLabel', {
                defaultMessage: 'Code intelligence findings',
              })}
              aria-busy={loading}
            >
              {items.map((item) => (
                <EuiFlexItem component="li" key={item.id} grow={false}>
                  <FindingRow item={item} onOpen={() => setSelected(item)} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
          {pageCount > 1 && (
            <>
              <EuiSpacer />
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiPagination
                    aria-label={i18n.translate('xpack.codeIntelligence.findings.paginationLabel', {
                      defaultMessage: 'Findings pagination',
                    })}
                    pageCount={pageCount}
                    activePage={page - 1}
                    onPageClick={(selectedPage) => setPage(Math.min(selectedPage + 1, 100))}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </>
      )}

      {selected !== undefined && (
        <FindingFlyout item={selected} onClose={() => setSelected(undefined)} />
      )}
    </>
  );
};
