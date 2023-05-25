/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumnCellAction,
  EuiProgress,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { cx } from '@emotion/css';
import { DataView } from '@kbn/data-views-plugin/common';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../common/constants';
import { useCloudPostureTable } from '../../common/hooks/use_cloud_posture_table';
import { useLatestVulnerabilities } from './hooks/use_latest_vulnerabilities';
import { VulnerabilityRecord } from './types';
import { LATEST_VULNERABILITIES_INDEX_PATTERN } from '../../../common/constants';
import { ErrorCallout } from '../configurations/layout/error_callout';
import { FindingsSearchBar } from '../configurations/layout/findings_search_bar';
import { useFilteredDataView } from '../../common/api/use_filtered_data_view';
import { CVSScoreBadge, SeverityStatusBadge } from '../../components/vulnerability_badges';
import { EmptyState } from '../../components/empty_state';
import { VulnerabilityFindingFlyout } from './vulnerabilities_finding_flyout/vulnerability_finding_flyout';
import { NoVulnerabilitiesStates } from '../../components/no_vulnerabilities_states';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { useLimitProperties } from '../../common/utils/get_limit_properties';
import { LimitedResultsBar } from '../configurations/layout/findings_layout';
import {
  getVulnerabilitiesColumnsGrid,
  vulnerabilitiesColumns,
} from './vulnerabilities_table_columns';
import { defaultLoadingRenderer, defaultNoDataRenderer } from '../../components/cloud_posture_page';
import { getFilters } from './utils/get_filters';
import { FILTER_IN, FILTER_OUT, SEARCH_BAR_PLACEHOLDER, VULNERABILITIES } from './translations';
import {
  severitySchemaConfig,
  severitySortScript,
  VULNERABILITY_SEVERITY_FIELD,
} from './utils/custom_sort_script';
import { useStyles } from './hooks/use_styles';

const getDefaultQuery = ({ query, filters }: any): any => ({
  query,
  filters,
  sort: [
    { id: vulnerabilitiesColumns.severity, direction: 'desc' },
    { id: vulnerabilitiesColumns.cvss, direction: 'desc' },
  ],
  pageIndex: 0,
});

export const Vulnerabilities = () => {
  const { data, isLoading, error } = useFilteredDataView(LATEST_VULNERABILITIES_INDEX_PATTERN);
  const getSetupStatus = useCspSetupStatusApi();

  if (getSetupStatus?.data?.vuln_mgmt?.status !== 'indexed') return <NoVulnerabilitiesStates />;

  if (error) {
    return <ErrorCallout error={error as Error} />;
  }
  if (isLoading) {
    return defaultLoadingRenderer();
  }

  if (!data) {
    return defaultNoDataRenderer();
  }

  return <VulnerabilitiesContent dataView={data} />;
};

const VulnerabilitiesContent = ({ dataView }: { dataView: DataView }) => {
  const {
    pageIndex,
    query,
    sort,
    queryError,
    pageSize,
    onChangeItemsPerPage,
    onChangePage,
    onSort,
    urlQuery,
    setUrlQuery,
    onResetFilters,
  } = useCloudPostureTable({
    dataView,
    defaultQuery: getDefaultQuery,
    paginationLocalStorageKey: LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY,
  });
  const { euiTheme } = useEuiTheme();
  const styles = useStyles();

  const [showHighlight, setHighlight] = useState(false);

  const onSortHandler = useCallback(
    (newSort: any) => {
      onSort(newSort);
      if (newSort.length !== sort.length) {
        setHighlight(true);
        setTimeout(() => {
          setHighlight(false);
        }, 1400);
      }
    },
    [onSort, sort]
  );

  const multiFieldsSort = useMemo(() => {
    return sort.map(({ id, direction }: { id: string; direction: string }) => {
      if (VULNERABILITY_SEVERITY_FIELD === id) {
        return severitySortScript(direction);
      }

      return {
        [id]: direction,
      };
    });
  }, [sort]);

  const { data, isLoading, isFetching } = useLatestVulnerabilities({
    query,
    sort: multiFieldsSort,
    enabled: !queryError,
    pageIndex,
    pageSize,
  });

  const invalidIndex = -1;

  const selectedVulnerability = useMemo(() => {
    return data?.page[urlQuery.vulnerabilityIndex];
  }, [data?.page, urlQuery.vulnerabilityIndex]);

  const onCloseFlyout = () => {
    setUrlQuery({
      vulnerabilityIndex: invalidIndex,
    });
  };

  const onOpenFlyout = useCallback(
    (vulnerabilityRow: VulnerabilityRecord) => {
      const vulnerabilityIndex = data?.page.findIndex(
        (vulnerabilityRecord: VulnerabilityRecord) =>
          vulnerabilityRecord.vulnerability?.id === vulnerabilityRow.vulnerability?.id &&
          vulnerabilityRecord.resource?.id === vulnerabilityRow.resource?.id &&
          vulnerabilityRecord.vulnerability.package.name ===
            vulnerabilityRow.vulnerability.package.name &&
          vulnerabilityRecord.vulnerability.package.version ===
            vulnerabilityRow.vulnerability.package.version
      );
      setUrlQuery({
        vulnerabilityIndex,
      });
    },
    [setUrlQuery, data?.page]
  );

  const { isLastLimitedPage, limitedTotalItemCount } = useLimitProperties({
    total: data?.total,
    pageIndex,
    pageSize,
  });

  const columns = useMemo(() => {
    const getColumnIdValue = (rowIndex: number, columnId: string) => {
      const vulnerabilityRow = data?.page[rowIndex] as VulnerabilityRecord;
      if (!vulnerabilityRow) return null;

      if (columnId === vulnerabilitiesColumns.vulnerability) {
        return vulnerabilityRow.vulnerability.id;
      }
      if (columnId === vulnerabilitiesColumns.cvss) {
        return vulnerabilityRow.vulnerability.score.base;
      }
      if (columnId === vulnerabilitiesColumns.resource) {
        return vulnerabilityRow.resource?.name;
      }
      if (columnId === vulnerabilitiesColumns.severity) {
        return vulnerabilityRow.vulnerability.severity;
      }
      if (columnId === vulnerabilitiesColumns.package) {
        return vulnerabilityRow.vulnerability?.package?.name;
      }
      if (columnId === vulnerabilitiesColumns.version) {
        return vulnerabilityRow.vulnerability?.package?.version;
      }
      if (columnId === vulnerabilitiesColumns.fix_version) {
        return vulnerabilityRow.vulnerability.package?.fixed_version;
      }
    };

    const cellActions: EuiDataGridColumnCellAction[] = [
      ({ Component, rowIndex, columnId }) => {
        const value = getColumnIdValue(rowIndex, columnId);

        if (!value) return null;
        return (
          <EuiToolTip
            position="top"
            content={i18n.translate(
              'xpack.csp.vulnerabilities.vulnerabilitiesTableCell.addFilterButtonTooltip',
              {
                defaultMessage: 'Add {columnId} filter',
                values: { columnId },
              }
            )}
          >
            <Component
              iconType="plusInCircle"
              aria-label={i18n.translate(
                'xpack.csp.vulnerabilities.vulnerabilitiesTableCell.addFilterButton',
                {
                  defaultMessage: 'Add {columnId} negated filter',
                  values: { columnId },
                }
              )}
              onClick={() => {
                setUrlQuery({
                  pageIndex: 0,
                  filters: getFilters({
                    filters: urlQuery.filters,
                    dataView,
                    field: columnId,
                    value,
                    negate: false,
                  }),
                });
              }}
            >
              {FILTER_IN}
            </Component>
          </EuiToolTip>
        );
      },
      ({ Component, rowIndex, columnId }) => {
        const value = getColumnIdValue(rowIndex, columnId);

        if (!value) return null;
        return (
          <EuiToolTip
            position="top"
            content={i18n.translate(
              'xpack.csp.vulnerabilities.vulnerabilitiesTableCell.addNegatedFilterButtonTooltip',
              {
                defaultMessage: 'Add {columnId} negated filter',
                values: { columnId },
              }
            )}
          >
            <Component
              iconType="minusInCircle"
              aria-label={i18n.translate(
                'xpack.csp.vulnerabilities.vulnerabilitiesTableCell.addNegateFilterButton',
                {
                  defaultMessage: 'Add {columnId} negated filter',
                  values: { columnId },
                }
              )}
              onClick={() => {
                setUrlQuery({
                  pageIndex: 0,
                  filters: getFilters({
                    filters: urlQuery.filters,
                    dataView,
                    field: columnId,
                    value: getColumnIdValue(rowIndex, columnId),
                    negate: true,
                  }),
                });
              }}
            >
              {FILTER_OUT}
            </Component>
          </EuiToolTip>
        );
      },
    ];

    return getVulnerabilitiesColumnsGrid(cellActions);
  }, [data?.page, dataView, setUrlQuery, urlQuery.filters]);

  const flyoutVulnerabilityIndex = urlQuery?.vulnerabilityIndex;

  const selectedVulnerabilityIndex = flyoutVulnerabilityIndex + pageIndex * pageSize;

  const renderCellValue = useMemo(() => {
    const Cell: React.FC<EuiDataGridCellValueElementProps> = ({
      columnId,
      rowIndex,
      setCellProps,
    }): React.ReactElement | null => {
      const rowIndexFromPage = rowIndex > pageSize - 1 ? rowIndex % pageSize : rowIndex;

      const vulnerabilityRow = data?.page[rowIndexFromPage] as VulnerabilityRecord;

      useEffect(() => {
        if (selectedVulnerabilityIndex === rowIndex) {
          setCellProps({
            style: {
              backgroundColor: euiTheme.colors.highlight,
            },
          });
        } else {
          setCellProps({
            style: {
              backgroundColor: 'inherit',
            },
          });
        }
      }, [rowIndex, setCellProps]);

      if (isFetching) return null;
      if (!vulnerabilityRow) return null;
      if (!vulnerabilityRow.vulnerability?.id) return null;

      if (columnId === vulnerabilitiesColumns.actions) {
        return (
          <EuiButtonIcon
            iconType="expand"
            aria-label="View"
            onClick={() => {
              onOpenFlyout(vulnerabilityRow);
            }}
          />
        );
      }
      if (columnId === vulnerabilitiesColumns.vulnerability) {
        return <>{vulnerabilityRow.vulnerability?.id}</>;
      }
      if (columnId === vulnerabilitiesColumns.cvss) {
        if (
          !vulnerabilityRow.vulnerability.score?.base ||
          !vulnerabilityRow.vulnerability.score?.version
        ) {
          return null;
        }
        return (
          <CVSScoreBadge
            score={vulnerabilityRow.vulnerability.score.base}
            version={vulnerabilityRow.vulnerability.score.version}
          />
        );
      }
      if (columnId === vulnerabilitiesColumns.resource) {
        return <>{vulnerabilityRow.resource?.name}</>;
      }
      if (columnId === vulnerabilitiesColumns.severity) {
        if (!vulnerabilityRow.vulnerability.severity) {
          return null;
        }
        return <SeverityStatusBadge status={vulnerabilityRow.vulnerability.severity} />;
      }

      if (columnId === vulnerabilitiesColumns.package) {
        return <>{vulnerabilityRow.vulnerability?.package?.name}</>;
      }
      if (columnId === vulnerabilitiesColumns.version) {
        return <>{vulnerabilityRow.vulnerability?.package?.version}</>;
      }
      if (columnId === vulnerabilitiesColumns.fix_version) {
        return <>{vulnerabilityRow.vulnerability?.package?.fixed_version}</>;
      }

      return null;
    };

    return Cell;
  }, [
    data?.page,
    euiTheme.colors.highlight,
    onOpenFlyout,
    pageSize,
    selectedVulnerabilityIndex,
    isFetching,
  ]);

  const onPaginateFlyout = useCallback(
    (nextVulnerabilityIndex: number) => {
      // the index of the vulnerability in the current page
      const newVulnerabilityIndex = nextVulnerabilityIndex % pageSize;

      // if the vulnerability is not in the current page, we need to change the page
      const flyoutPageIndex = Math.floor(nextVulnerabilityIndex / pageSize);

      setUrlQuery({
        pageIndex: flyoutPageIndex,
        vulnerabilityIndex: newVulnerabilityIndex,
      });
    },
    [pageSize, setUrlQuery]
  );

  const error = queryError || null;

  if (error) {
    return <ErrorCallout error={error as Error} />;
  }
  if (isLoading) {
    return defaultLoadingRenderer();
  }

  if (!data?.page) {
    return defaultNoDataRenderer();
  }

  const showVulnerabilityFlyout = flyoutVulnerabilityIndex > invalidIndex;

  return (
    <>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={(newQuery) => {
          setUrlQuery({ ...newQuery, pageIndex: 0 });
        }}
        loading={isLoading}
        placeholder={SEARCH_BAR_PLACEHOLDER}
      />
      <EuiSpacer size="l" />
      {!isLoading && data.page.length === 0 ? (
        <EmptyState onResetFilters={onResetFilters} />
      ) : (
        <>
          <EuiProgress
            size="xs"
            color="accent"
            style={{
              opacity: isFetching ? 1 : 0,
            }}
          />
          <EuiDataGrid
            className={cx({ [styles.gridStyle]: true }, { [styles.highlightStyle]: showHighlight })}
            aria-label={VULNERABILITIES}
            columns={columns}
            columnVisibility={{
              visibleColumns: columns.map(({ id }) => id),
              setVisibleColumns: () => {},
            }}
            schemaDetectors={[severitySchemaConfig]}
            rowCount={limitedTotalItemCount}
            toolbarVisibility={{
              showColumnSelector: false,
              showDisplaySelector: false,
              showKeyboardShortcuts: false,
              additionalControls: {
                left: {
                  prepend: (
                    <>
                      <EuiButtonEmpty size="xs" color="text">
                        {i18n.translate('xpack.csp.vulnerabilities.totalVulnerabilities', {
                          defaultMessage:
                            '{total, plural, one {# Vulnerability} other {# Vulnerabilities}}',
                          values: { total: data?.total },
                        })}
                      </EuiButtonEmpty>
                    </>
                  ),
                },
              },
            }}
            gridStyle={{
              border: 'horizontal',
              cellPadding: 'l',
              stripes: false,
              rowHover: 'none',
              header: 'underline',
            }}
            renderCellValue={renderCellValue}
            inMemory={{ level: 'enhancements' }}
            sorting={{ columns: sort, onSort: onSortHandler }}
            pagination={{
              pageIndex,
              pageSize,
              pageSizeOptions: [10, 25, 100],
              onChangeItemsPerPage,
              onChangePage,
            }}
          />
          {isLastLimitedPage && <LimitedResultsBar />}
          {showVulnerabilityFlyout && (
            <VulnerabilityFindingFlyout
              flyoutIndex={selectedVulnerabilityIndex}
              vulnerabilityRecord={selectedVulnerability}
              totalVulnerabilitiesCount={limitedTotalItemCount}
              onPaginate={onPaginateFlyout}
              closeFlyout={onCloseFlyout}
              isLoading={isFetching}
            />
          )}
        </>
      )}
    </>
  );
};
