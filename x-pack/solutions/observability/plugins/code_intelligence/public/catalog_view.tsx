/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCode,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiPanel,
  EuiProgress,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';

import {
  CATALOG_SEVERITIES,
  CATALOG_SIGNAL_TYPES,
  CATALOG_SORTS,
  type CatalogSeverity,
  type CatalogSignalType,
  type CatalogSort,
} from '../common/catalog_filters';
import { AddQueryToAgentButtonIcon } from './agent_builder/add_query_context';
import type { CatalogPageContext } from './agent_builder/page_context';
import type { CatalogItem, CatalogResponse, Repository } from './api';
import { getCatalog } from './api';
import { CatalogEntryFlyout } from './catalog_entry_flyout';
import { CatalogFilterPopover } from './catalog_filter_popover';
import { SeverityBadge, severityLabels } from './severity_badge';
import { SignalTypeBadge, signalTypeLabels } from './signal_type_badge';

interface Props {
  http: HttpSetup;
  repositories: Repository[];
  repositoriesLoading: boolean;
  repositoriesError?: string;
  reloadRepositories: () => void;
  initialRepositories?: string[];
  initialSeverities?: CatalogSeverity[];
  /** Reports the filters, total, and open entry, for the AI Agent page context. */
  onContextChange?: (context: CatalogPageContext) => void;
}

const CatalogRow = ({ item, onOpen }: { item: CatalogItem; onOpen: () => void }) => (
  <EuiPanel
    hasBorder
    paddingSize="s"
    onClick={onOpen}
    data-test-subj="codeIntelligenceCatalogRow"
    aria-label={i18n.translate('xpack.codeIntelligence.catalog.openEntry', {
      defaultMessage: 'Open {title}',
      values: { title: item.title ?? item.id },
    })}
  >
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <SignalTypeBadge signalType={item.signal_type} />
      </EuiFlexItem>
      {item.severity_score !== undefined && (
        <EuiFlexItem grow={false}>
          <SeverityBadge score={item.severity_score} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiText size="xs" color="subdued">
          {item.repository}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <AddQueryToAgentButtonIcon entry={item} />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="xs" />
    <EuiText size="s">
      <strong>{item.title ?? '—'}</strong>
    </EuiText>
    {item.query !== undefined && (
      <>
        <EuiSpacer size="xs" />
        <div className="eui-textTruncate">
          <EuiCode transparentBackground data-test-subj="codeIntelligenceCatalogRowQuery">
            {item.query.replace(/\s+/g, ' ').trim()}
          </EuiCode>
        </div>
      </>
    )}
  </EuiPanel>
);

export const CatalogView = ({
  http,
  repositories,
  repositoriesLoading,
  repositoriesError,
  reloadRepositories,
  initialRepositories = [],
  initialSeverities = [],
  onContextChange,
}: Props) => {
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>(initialRepositories);
  const [kinds, setKinds] = useState<CatalogSignalType[]>([]);
  const [severities, setSeverities] = useState<CatalogSeverity[]>(initialSeverities);
  const [sort, setSort] = useState<CatalogSort>('default');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<CatalogResponse>();
  const [selected, setSelected] = useState<CatalogItem>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [requestSequence, setRequestSequence] = useState(0);

  useEffect(() => {
    if (repositoriesLoading || repositories.length === 0) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    void getCatalog(http, {
      repositories: selectedRepositories,
      kinds,
      severities,
      sort,
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
            i18n.translate('xpack.codeIntelligence.catalog.loadError', {
              defaultMessage: 'The catalog could not be loaded.',
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
    severities,
    sort,
  ]);

  const total = response?.total;
  useEffect(() => {
    onContextChange?.({
      tab: 'catalog',
      repositories: selectedRepositories,
      signalTypes: kinds,
      severities,
      search: query,
      sort,
      ...(total === undefined ? {} : { total }),
      ...(selected === undefined
        ? {}
        : {
            selectedEntry: {
              id: selected.id,
              repository: selected.repository,
              title: selected.title,
              signal_type: selected.signal_type,
              query: selected.query,
            },
          }),
    });
  }, [kinds, onContextChange, query, selected, selectedRepositories, severities, sort, total]);

  if (!repositoriesLoading && repositoriesError !== undefined) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={<h2>{repositoriesError}</h2>}
        actions={
          <EuiButton
            data-test-subj="codeIntelligenceCatalogRepositoriesRetryButton"
            color="danger"
            onClick={reloadRepositories}
          >
            {i18n.translate('xpack.codeIntelligence.catalog.repositoriesRetry', {
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
            {i18n.translate('xpack.codeIntelligence.catalog.repositoryRequiredTitle', {
              defaultMessage: 'A repository is required',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.codeIntelligence.catalog.repositoryRequiredBody', {
              defaultMessage: 'Configure a repository before browsing the catalog.',
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
            data-test-subj="codeIntelligenceQueryFilter"
            placeholder={i18n.translate('xpack.codeIntelligence.catalog.queryPlaceholder', {
              defaultMessage: 'Search titles, descriptions, and queries',
            })}
            aria-label={i18n.translate('xpack.codeIntelligence.catalog.queryFilter', {
              defaultMessage: 'Search',
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
              filter="repository"
              title={i18n.translate('xpack.codeIntelligence.catalog.repositoryFilter', {
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
              filter="kind"
              title={i18n.translate('xpack.codeIntelligence.catalog.kindFilter', {
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
          <EuiFilterGroup>
            <CatalogFilterPopover
              filter="severity"
              title={i18n.translate('xpack.codeIntelligence.catalog.severityFilter', {
                defaultMessage: 'Severity',
              })}
              options={CATALOG_SEVERITIES.map((value) => ({
                value,
                label: severityLabels[value],
              }))}
              selected={severities}
              onChange={(next) => {
                setSeverities(next);
                setPage(1);
              }}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            data-test-subj="codeIntelligenceCatalogSort"
            prepend={i18n.translate('xpack.codeIntelligence.catalog.sortLabel', {
              defaultMessage: 'Sort by',
            })}
            aria-label={i18n.translate('xpack.codeIntelligence.catalog.sortAriaLabel', {
              defaultMessage: 'Sort catalog entries',
            })}
            options={[
              {
                value: 'default',
                text:
                  query === ''
                    ? i18n.translate('xpack.codeIntelligence.catalog.sortRecent', {
                        defaultMessage: 'Recently updated',
                      })
                    : i18n.translate('xpack.codeIntelligence.catalog.sortRelevance', {
                        defaultMessage: 'Best match',
                      }),
              },
              {
                value: 'severity_desc',
                text: i18n.translate('xpack.codeIntelligence.catalog.sortSeverityDesc', {
                  defaultMessage: 'Severity: highest first',
                }),
              },
              {
                value: 'severity_asc',
                text: i18n.translate('xpack.codeIntelligence.catalog.sortSeverityAsc', {
                  defaultMessage: 'Severity: lowest first',
                }),
              },
            ]}
            value={sort}
            onChange={(event) => {
              const next = CATALOG_SORTS.find((value) => value === event.target.value);
              if (next === undefined) return;
              setSort(next);
              setPage(1);
            }}
          />
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
              data-test-subj="codeIntelligenceCatalogRetryButton"
              color="danger"
              onClick={() => setRequestSequence((value) => value + 1)}
            >
              {i18n.translate('xpack.codeIntelligence.catalog.retry', {
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
                data-test-subj="codeIntelligenceCatalogEmpty"
              >
                <p>
                  {i18n.translate('xpack.codeIntelligence.catalog.emptyMessage', {
                    defaultMessage: 'No catalog entries match these filters.',
                  })}
                </p>
              </EuiText>
            )
          ) : (
            <EuiFlexGroup
              component="ul"
              direction="column"
              gutterSize="s"
              aria-label={i18n.translate('xpack.codeIntelligence.catalog.listLabel', {
                defaultMessage: 'Code intelligence catalog',
              })}
              aria-busy={loading}
            >
              {items.map((item) => (
                <EuiFlexItem component="li" key={item.id} grow={false}>
                  <CatalogRow item={item} onOpen={() => setSelected(item)} />
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
                    aria-label={i18n.translate('xpack.codeIntelligence.catalog.paginationLabel', {
                      defaultMessage: 'Catalog pagination',
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
        <CatalogEntryFlyout item={selected} onClose={() => setSelected(undefined)} />
      )}
    </>
  );
};
