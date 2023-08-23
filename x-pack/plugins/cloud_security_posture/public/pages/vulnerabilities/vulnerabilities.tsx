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
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { cx } from '@emotion/css';
import { DataView } from '@kbn/data-views-plugin/common';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { Routes, Route } from '@kbn/shared-ux-router';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../common/constants';
import { useCloudPostureTable } from '../../common/hooks/use_cloud_posture_table';
import { useLatestVulnerabilities } from './hooks/use_latest_vulnerabilities';
import type { VulnerabilitiesQueryData } from './types';
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
import { SEARCH_BAR_PLACEHOLDER, VULNERABILITIES } from './translations';
import {
  severitySchemaConfig,
  severitySortScript,
  getCaseInsensitiveSortScript,
} from './utils/custom_sort_script';
import { useStyles } from './hooks/use_styles';
import { FindingsGroupBySelector } from '../configurations/layout/findings_group_by_selector';
import { vulnerabilitiesPathnameHandler } from './utils/vulnerabilities_pathname_handler';
import { findingsNavigation } from '../../common/navigation/constants';
import { VulnerabilitiesByResource } from './vulnerabilities_by_resource/vulnerabilities_by_resource';
import { ResourceVulnerabilities } from './vulnerabilities_by_resource/resource_vulnerabilities/resource_vulnerabilities';
import { getVulnerabilitiesGridCellActions } from './utils/get_vulnerabilities_grid_cell_actions';

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

  return (
    <Routes>
      <Route
        exact
        path={findingsNavigation.resource_vulnerabilities.path}
        render={() => <ResourceVulnerabilities dataView={data} />}
      />
      <Route
        exact
        path={findingsNavigation.vulnerabilities_by_resource.path}
        render={() => <VulnerabilitiesByResource dataView={data} />}
      />
      <Route
        path={findingsNavigation.vulnerabilities.path}
        render={() => <VulnerabilitiesContent dataView={data} />}
      />
    </Routes>
  );
};

const VulnerabilitiesDataGrid = ({
  dataView,
  data,
  isFetching,
}: {
  dataView: DataView;
  data: VulnerabilitiesQueryData | undefined;
  isFetching: boolean;
}) => {
  const {
    pageIndex,
    sort,
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

  const invalidIndex = -1;

  const selectedVulnerability = useMemo(() => {
    return data?.page[urlQuery.vulnerabilityIndex];
  }, [data?.page, urlQuery.vulnerabilityIndex]);

  const onCloseFlyout = () => {
    setUrlQuery({
      vulnerabilityIndex: invalidIndex,
    });
  };

  const onSortHandler = useCallback(
    (newSort: any) => {
      onSort(newSort);
      if (newSort.length !== sort.length) {
        setHighlight(true);
        setTimeout(() => {
          setHighlight(false);
        }, 2000);
      }
    },
    [onSort, sort]
  );

  const { isLastLimitedPage, limitedTotalItemCount } = useLimitProperties({
    total: data?.total,
    pageIndex,
    pageSize,
  });

  const onOpenFlyout = useCallback(
    (vulnerabilityRow: VulnerabilitiesQueryData['page'][number]) => {
      const vulnerabilityIndex = data?.page.findIndex(
        (vulnerabilityRecord: VulnerabilitiesQueryData['page'][number]) =>
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

  const columns = useMemo(() => {
    if (!data?.page) {
      return [];
    }
    return getVulnerabilitiesGridCellActions({
      columnGridFn: getVulnerabilitiesColumnsGrid,
      columns: vulnerabilitiesColumns,
      dataView,
      pageSize,
      data: data.page,
      setUrlQuery,
      filters: urlQuery.filters,
    });
  }, [data?.page, dataView, pageSize, setUrlQuery, urlQuery.filters]);

  const flyoutVulnerabilityIndex = urlQuery?.vulnerabilityIndex;

  const selectedVulnerabilityIndex = flyoutVulnerabilityIndex + pageIndex * pageSize;

  const renderCellValue = useMemo(() => {
    const Cell: React.FC<EuiDataGridCellValueElementProps> = ({
      columnId,
      rowIndex,
      setCellProps,
    }): React.ReactElement | null => {
      const rowIndexFromPage = rowIndex > pageSize - 1 ? rowIndex % pageSize : rowIndex;

      const vulnerabilityRow = data?.page[rowIndexFromPage];

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
      if (columnId === vulnerabilitiesColumns.resourceName) {
        return <>{vulnerabilityRow.resource?.name}</>;
      }
      if (columnId === vulnerabilitiesColumns.resourceId) {
        return <>{vulnerabilityRow.resource?.id}</>;
      }
      if (columnId === vulnerabilitiesColumns.severity) {
        if (!vulnerabilityRow.vulnerability.severity) {
          return null;
        }
        return <SeverityStatusBadge severity={vulnerabilityRow.vulnerability.severity} />;
      }

      if (columnId === vulnerabilitiesColumns.package) {
        return <>{vulnerabilityRow.vulnerability?.package?.name}</>;
      }
      if (columnId === vulnerabilitiesColumns.version) {
        return <>{vulnerabilityRow.vulnerability?.package?.version}</>;
      }
      if (columnId === vulnerabilitiesColumns.fixedVersion) {
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

  const showVulnerabilityFlyout = flyoutVulnerabilityIndex > invalidIndex;

  if (data?.page.length === 0) {
    return <EmptyState onResetFilters={onResetFilters} />;
  }

  return (
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
          showFullScreenSelector: false,
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
            right: (
              <EuiFlexItem grow={false} className={styles.groupBySelector}>
                <FindingsGroupBySelector
                  type="default"
                  pathnameHandler={vulnerabilitiesPathnameHandler}
                />
              </EuiFlexItem>
            ),
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
      {showVulnerabilityFlyout && selectedVulnerability && (
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
  );
};
const VulnerabilitiesContent = ({ dataView }: { dataView: DataView }) => {
  const { pageIndex, query, sort, queryError, pageSize, setUrlQuery } = useCloudPostureTable({
    dataView,
    defaultQuery: getDefaultQuery,
    paginationLocalStorageKey: LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY,
  });

  const multiFieldsSort = useMemo(() => {
    return sort.map(({ id, direction }: { id: string; direction: string }) => {
      if (id === vulnerabilitiesColumns.severity) {
        return severitySortScript(direction);
      }
      if (id === vulnerabilitiesColumns.package) {
        return getCaseInsensitiveSortScript(id, direction);
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

  const error = queryError || null;

  if (isLoading && !error) {
    return defaultLoadingRenderer();
  }

  if (!data?.page && !error) {
    return defaultNoDataRenderer();
  }

  return (
    <>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={(newQuery) => {
          setUrlQuery({ ...newQuery, pageIndex: 0 });
        }}
        loading={isFetching}
        placeholder={SEARCH_BAR_PLACEHOLDER}
      />
      <EuiSpacer size="m" />
      {error && <ErrorCallout error={error as Error} />}
      {!error && (
        <VulnerabilitiesDataGrid dataView={dataView} data={data} isFetching={isFetching} />
      )}
    </>
  );
};
