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
import { css } from '@emotion/react';
import { DataView } from '@kbn/data-views-plugin/common';
import React, { useCallback, useMemo } from 'react';
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
import { usePageSlice } from '../../common/hooks/use_page_slice';

const getDefaultQuery = ({ query, filters }: any): any => ({
  query,
  filters,
  sort: [{ id: vulnerabilitiesColumns.cvss, direction: 'desc' }],
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
  });

  const slicedPage = usePageSlice(data?.page, pageIndex, pageSize);

  const invalidIndex = -1;

  const selectedVulnerability = useMemo(() => {
    return slicedPage[urlQuery.vulnerabilityIndex];
  }, [slicedPage, urlQuery.vulnerabilityIndex]);

  const onCloseFlyout = () => {
    setUrlQuery({
      vulnerabilityIndex: invalidIndex,
    });
  };

  const onOpenFlyout = useCallback(
    (vulnerabilityRow: VulnerabilityRecord) => {
      const vulnerabilityIndex = slicedPage.findIndex(
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
    [setUrlQuery, slicedPage]
  );

  const { isLastLimitedPage, limitedTotalItemCount } = useLimitProperties({
    total: data?.total,
    pageIndex,
    pageSize,
  });

  const columns = useMemo(() => {
    const getColumnIdValue = (rowIndex: number, columnId: string) => {
      const vulnerabilityRow = data?.page[rowIndex] as VulnerabilityRecord;
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
      if (columnId === vulnerabilitiesColumns.package_version) {
        return vulnerabilityRow.vulnerability?.package?.name;
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
          <EuiToolTip position="top" content={FILTER_IN}>
            <Component
              iconType="plusInCircle"
              aria-label={FILTER_IN}
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
          <EuiToolTip position="top" content={FILTER_OUT}>
            <Component
              iconType="minusInCircle"
              aria-label={FILTER_OUT}
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

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const vulnerabilityRow = data?.page[rowIndex] as VulnerabilityRecord;

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
        return vulnerabilityRow.vulnerability.id || '';
      }
      if (columnId === vulnerabilitiesColumns.cvss) {
        if (!vulnerabilityRow.vulnerability.score?.base) {
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
        return vulnerabilityRow.resource?.name || null;
      }
      if (columnId === vulnerabilitiesColumns.severity) {
        if (!vulnerabilityRow.vulnerability.severity) {
          return null;
        }
        return <SeverityStatusBadge status={vulnerabilityRow.vulnerability.severity} />;
      }
      if (columnId === vulnerabilitiesColumns.package_version) {
        return (
          <>
            {vulnerabilityRow.vulnerability?.package?.name}{' '}
            {vulnerabilityRow.vulnerability?.package?.version}
          </>
        );
      }
      if (columnId === vulnerabilitiesColumns.fix_version) {
        if (!vulnerabilityRow.vulnerability.package?.fixed_version) {
          return null;
        }
        return (
          <>
            {vulnerabilityRow.vulnerability.package?.name}{' '}
            {vulnerabilityRow.vulnerability.package.fixed_version}
          </>
        );
      }
    };
  }, [data?.page, onOpenFlyout]);

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

  const flyoutVulnerabilityIndex = urlQuery?.vulnerabilityIndex;
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
          {isFetching ? (
            <EuiProgress size="xs" color="accent" />
          ) : (
            <EuiSpacer
              css={css`
                height: 2px;
              `}
            />
          )}
          <EuiDataGrid
            css={css`
              & .euiDataGridHeaderCell__icon {
                display: none;
              }
              & .euiDataGrid__controls {
                border-bottom: none;
              }
              & .euiButtonIcon {
                color: ${euiTheme.colors.primary};
              }
              & .euiDataGridRowCell {
                font-size: ${euiTheme.size.m};
              }
              &
                .euiDataGridRowCell__expandActions
                > [data-test-subj='euiDataGridCellExpandButton'] {
                display: none;
              }
              & .euiDataGridRowCell__expandFlex {
                align-items: center;
              }
            `}
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
                    <EuiButtonEmpty size="xs" color="text">
                      {i18n.translate('xpack.csp.vulnerabilities.totalVulnerabilities', {
                        defaultMessage:
                          '{total, plural, one {# Vulnerability} other {# Vulnerabilities}}',
                        values: { total: data?.total },
                      })}
                    </EuiButtonEmpty>
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
            inMemory={{ level: 'pagination' }}
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
          {showVulnerabilityFlyout && (
            <VulnerabilityFindingFlyout
              flyoutIndex={flyoutVulnerabilityIndex + pageIndex * pageSize}
              vulnerabilityRecord={selectedVulnerability}
              totalVulnerabilitiesCount={limitedTotalItemCount}
              onPaginate={onPaginateFlyout}
              closeFlyout={onCloseFlyout}
            />
          )}
        </>
      )}
    </>
  );
};
