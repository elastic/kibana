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
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiPagination,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';

import type { CatalogItem, CatalogResponse, Repository } from './api';
import { getCatalog } from './api';

interface Props {
  http: HttpSetup;
  repositories: Repository[];
  repositoriesLoading: boolean;
  repositoriesError?: string;
  reloadRepositories: () => void;
}

type Kind = '' | 'log' | 'trace' | 'metric';

export const CatalogView = ({
  http,
  repositories,
  repositoriesLoading,
  repositoriesError,
  reloadRepositories,
}: Props) => {
  const [repository, setRepository] = useState('');
  const [kind, setKind] = useState<Kind>('');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<CatalogResponse>();
  const [selected, setSelected] = useState<CatalogItem>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [requestSequence, setRequestSequence] = useState(0);

  useEffect(() => {
    if (repository === '' && repositories[0] !== undefined) {
      setRepository(repositories[0].repository);
    }
  }, [repositories, repository]);

  useEffect(() => {
    if (repository === '') return;
    let active = true;
    setLoading(true);
    setError(undefined);
    void getCatalog(http, {
      repository: repository.slice(0, 256),
      ...(kind === '' ? {} : { kind }),
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
  }, [http, kind, page, query, repository, requestSequence]);

  const columns = useMemo<Array<EuiBasicTableColumn<CatalogItem>>>(
    () => [
      {
        field: 'repository',
        name: i18n.translate('xpack.codeIntelligence.catalog.repositoryColumn', {
          defaultMessage: 'Repository',
        }),
        render: (value?: string) => value ?? '—',
      },
      {
        field: 'signal_type',
        name: i18n.translate('xpack.codeIntelligence.catalog.signalTypeColumn', {
          defaultMessage: 'Signal type',
        }),
        render: (value?: string) => value ?? '—',
      },
      {
        name: i18n.translate('xpack.codeIntelligence.catalog.titleTemplateColumn', {
          defaultMessage: 'Title / template',
        }),
        render: (item: CatalogItem) => (
          <>
            <EuiText size="s">
              <strong>{item.title ?? '—'}</strong>
            </EuiText>
            {item.query !== undefined && (
              <EuiText size="xs">
                <p>{item.query}</p>
              </EuiText>
            )}
          </>
        ),
      },
      {
        name: i18n.translate('xpack.codeIntelligence.catalog.evidenceColumn', {
          defaultMessage: 'First evidence',
        }),
        render: ({ evidence }: CatalogItem) => {
          const first = evidence?.[0];
          return first?.path === undefined
            ? '—'
            : `${first.path}${first.line === undefined ? '' : `:${first.line}`}`;
        },
      },
      {
        name: i18n.translate('xpack.codeIntelligence.catalog.validationColumn', {
          defaultMessage: 'Validation status',
        }),
        render: ({ validation }: CatalogItem) => validation?.status ?? '—',
      },
    ],
    []
  );

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

  return (
    <>
      <EuiForm
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(queryInput.trim().slice(0, 512));
        }}
      >
        <EuiFlexGroup alignItems="flexEnd" gutterSize="m">
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.codeIntelligence.catalog.repositoryFilter', {
                defaultMessage: 'Repository',
              })}
            >
              <EuiSelect
                data-test-subj="codeIntelligenceRepositoryFilter"
                value={repository}
                disabled={repositoriesLoading}
                options={[
                  {
                    value: '',
                    text: i18n.translate('xpack.codeIntelligence.catalog.repositoryPlaceholder', {
                      defaultMessage: 'Select a repository',
                    }),
                  },
                  ...repositories.map(({ repository: value }) => ({ value, text: value })),
                ]}
                onChange={(event) => {
                  setRepository(event.target.value.slice(0, 256));
                  setPage(1);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.codeIntelligence.catalog.kindFilter', {
                defaultMessage: 'Kind',
              })}
            >
              <EuiSelect
                data-test-subj="codeIntelligenceKindFilter"
                value={kind}
                options={[
                  {
                    value: '',
                    text: i18n.translate('xpack.codeIntelligence.catalog.allKinds', {
                      defaultMessage: 'All kinds',
                    }),
                  },
                  {
                    value: 'log',
                    text: i18n.translate('xpack.codeIntelligence.catalog.logKind', {
                      defaultMessage: 'Log',
                    }),
                  },
                  {
                    value: 'trace',
                    text: i18n.translate('xpack.codeIntelligence.catalog.traceKind', {
                      defaultMessage: 'Trace',
                    }),
                  },
                  {
                    value: 'metric',
                    text: i18n.translate('xpack.codeIntelligence.catalog.metricKind', {
                      defaultMessage: 'Metric',
                    }),
                  },
                ]}
                onChange={(event) => {
                  setKind(event.target.value as Kind);
                  setPage(1);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiFormRow
              label={i18n.translate('xpack.codeIntelligence.catalog.queryFilter', {
                defaultMessage: 'Search',
              })}
            >
              <EuiFieldSearch
                data-test-subj="codeIntelligenceQueryFilter"
                value={queryInput}
                maxLength={512}
                onChange={(event) => setQueryInput(event.target.value.slice(0, 512))}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="codeIntelligenceSearchButton"
              type="submit"
              fill
              disabled={repository === ''}
            >
              {i18n.translate('xpack.codeIntelligence.catalog.searchAction', {
                defaultMessage: 'Search',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>

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
          <EuiBasicTable
            tableCaption={i18n.translate('xpack.codeIntelligence.catalog.tableCaption', {
              defaultMessage: 'Code intelligence catalog',
            })}
            items={response?.items ?? []}
            columns={columns}
            loading={loading}
            itemId="id"
            noItemsMessage={i18n.translate('xpack.codeIntelligence.catalog.emptyMessage', {
              defaultMessage: 'No catalog entries match these filters.',
            })}
            rowProps={(item) => ({ onClick: () => setSelected(item) })}
          />
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
        <EuiFlyout
          ownFocus
          aria-label={i18n.translate('xpack.codeIntelligence.catalog.flyoutLabel', {
            defaultMessage: 'Catalog entry details',
          })}
          onClose={() => setSelected(undefined)}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.codeIntelligence.catalog.flyoutTitle', {
                  defaultMessage: 'Catalog entry JSON',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiCodeBlock language="json" isCopyable overflowHeight={600}>
              {JSON.stringify(selected, null, 2)}
            </EuiCodeBlock>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
