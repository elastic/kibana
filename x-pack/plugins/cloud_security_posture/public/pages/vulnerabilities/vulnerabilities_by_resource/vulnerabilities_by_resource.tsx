/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { Link, generatePath } from 'react-router-dom';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../../common/constants';
import { findingsNavigation } from '../../../common/navigation/constants';
import { useCloudPostureTable } from '../../../common/hooks/use_cloud_posture_table';
import { ErrorCallout } from '../../configurations/layout/error_callout';
import { FindingsSearchBar } from '../../configurations/layout/findings_search_bar';
import { useLimitProperties } from '../../../common/utils/get_limit_properties';
import { LimitedResultsBar } from '../../configurations/layout/findings_layout';
import {
  getVulnerabilitiesByResourceColumnsGrid,
  vulnerabilitiesByResourceColumns,
} from './vulnerabilities_by_resource_table_columns';
import {
  defaultLoadingRenderer,
  defaultNoDataRenderer,
} from '../../../components/cloud_posture_page';
import { SEARCH_BAR_PLACEHOLDER, VULNERABILITIES } from '../translations';
import { useStyles } from '../hooks/use_styles';
import { FindingsGroupBySelector } from '../../configurations/layout/findings_group_by_selector';
import { vulnerabilitiesPathnameHandler } from '../utils/vulnerabilities_pathname_handler';
import { useLatestVulnerabilitiesByResource } from '../hooks/use_latest_vulnerabilities_by_resource';
import { EmptyState } from '../../../components/empty_state';
import { SeverityMap } from './severity_map';
import { VULNERABILITY_RESOURCE_COUNT } from './test_subjects';
import { getVulnerabilitiesGridCellActions } from '../utils/get_vulnerabilities_grid_cell_actions';
import type { VulnerabilitiesByResourceQueryData } from '../types';

const getDefaultQuery = ({ query, filters }: any): any => ({
  query,
  filters,
  sort: [{ id: vulnerabilitiesByResourceColumns.vulnerabilities_count, direction: 'desc' }],
  pageIndex: 0,
});

const VulnerabilitiesByResourceDataGrid = ({
  dataView,
  data,
  isFetching,
}: {
  dataView: DataView;
  data: VulnerabilitiesByResourceQueryData | undefined;
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
  const styles = useStyles();

  const { isLastLimitedPage, limitedTotalItemCount } = useLimitProperties({
    total: data?.total,
    pageIndex,
    pageSize,
  });

  const columns = useMemo(() => {
    if (!data?.page) {
      return [];
    }
    return getVulnerabilitiesGridCellActions<typeof data.page>({
      columnGridFn: getVulnerabilitiesByResourceColumnsGrid,
      columns: vulnerabilitiesByResourceColumns,
      dataView,
      pageSize,
      data: data.page,
      setUrlQuery,
      filters: urlQuery.filters,
    });
  }, [data, dataView, pageSize, setUrlQuery, urlQuery.filters]);

  const renderCellValue = useMemo(() => {
    const Cell: React.FC<EuiDataGridCellValueElementProps> = ({
      columnId,
      rowIndex,
    }): React.ReactElement | null => {
      const rowIndexFromPage = rowIndex > pageSize - 1 ? rowIndex % pageSize : rowIndex;

      const resourceVulnerabilityRow = data?.page[rowIndexFromPage];

      if (isFetching) return null;
      if (!resourceVulnerabilityRow?.resource?.id) return null;

      if (columnId === vulnerabilitiesByResourceColumns.resourceId) {
        return (
          <Link
            to={generatePath(findingsNavigation.resource_vulnerabilities.path, {
              resourceId: encodeURIComponent(resourceVulnerabilityRow?.resource?.id),
            })}
            className="eui-textTruncate"
            title={resourceVulnerabilityRow?.resource?.id}
          >
            {resourceVulnerabilityRow?.resource?.id}
          </Link>
        );
      }
      if (columnId === vulnerabilitiesByResourceColumns.resourceName) {
        return <>{resourceVulnerabilityRow?.resource?.name}</>;
      }
      if (columnId === vulnerabilitiesByResourceColumns.region) {
        return <>{resourceVulnerabilityRow?.cloud?.region}</>;
      }
      if (columnId === vulnerabilitiesByResourceColumns.vulnerabilities_count) {
        return (
          <EuiBadge color="hollow" data-test-subj={VULNERABILITY_RESOURCE_COUNT}>
            {resourceVulnerabilityRow.vulnerabilities_count}
          </EuiBadge>
        );
      }

      if (columnId === vulnerabilitiesByResourceColumns.severity_map) {
        return (
          <SeverityMap
            total={resourceVulnerabilityRow.vulnerabilities_count}
            severityMap={resourceVulnerabilityRow.severity_map}
          />
        );
      }
      return null;
    };

    return Cell;
  }, [data?.page, pageSize, isFetching]);

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
        className={styles.gridStyle}
        aria-label={VULNERABILITIES}
        columns={columns}
        columnVisibility={{
          visibleColumns: columns.map(({ id }) => id),
          setVisibleColumns: () => {},
        }}
        rowCount={limitedTotalItemCount}
        toolbarVisibility={{
          showColumnSelector: false,
          showDisplaySelector: false,
          showKeyboardShortcuts: false,
          showSortSelector: false,
          showFullScreenSelector: false,
          additionalControls: {
            left: {
              prepend: (
                <>
                  <EuiButtonEmpty size="xs" color="text">
                    {i18n.translate('xpack.csp.vulnerabilitiesByResource.totalResources', {
                      defaultMessage: '{total, plural, one {# Resource} other {# Resources}}',
                      values: { total: data?.total },
                    })}
                  </EuiButtonEmpty>
                  <EuiButtonEmpty size="xs" color="text">
                    {i18n.translate('xpack.csp.vulnerabilitiesByResource.totalVulnerabilities', {
                      defaultMessage:
                        '{total, plural, one {# Vulnerability} other {# Vulnerabilities}}',
                      values: { total: data?.total_vulnerabilities },
                    })}
                  </EuiButtonEmpty>
                </>
              ),
            },
            right: (
              <EuiFlexItem grow={false} className={styles.groupBySelector}>
                <FindingsGroupBySelector
                  type="resource"
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
        sorting={{ columns: sort, onSort }}
        pagination={{
          pageIndex,
          pageSize,
          pageSizeOptions: [10, 25, 100],
          onChangeItemsPerPage,
          onChangePage,
        }}
      />
      {isLastLimitedPage && <LimitedResultsBar />}
    </>
  );
};

export const VulnerabilitiesByResource = ({ dataView }: { dataView: DataView }) => {
  const { pageIndex, query, sort, queryError, pageSize, setUrlQuery } = useCloudPostureTable({
    dataView,
    defaultQuery: getDefaultQuery,
    paginationLocalStorageKey: LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY,
  });

  const { data, isLoading, isFetching } = useLatestVulnerabilitiesByResource({
    query,
    sortOrder: sort[0]?.direction,
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
        <VulnerabilitiesByResourceDataGrid
          dataView={dataView}
          data={data}
          isFetching={isFetching}
        />
      )}
    </>
  );
};
