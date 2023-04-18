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
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DataView } from '@kbn/data-views-plugin/common';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../common/constants';
import { useCloudPostureTable } from '../../common/hooks/use_cloud_posture_table';
import { useLatestVulnerabilities } from './hooks/use_latest_vulnerabilities';
import { VulnerabilityRecord } from './types';
import { getVulnerabilitiesColumnsGrid, vulnerabilitiesColumns } from './utils';
import { LATEST_VULNERABILITIES_INDEX_PATTERN } from '../../../common/constants';
import { ErrorCallout } from '../configurations/layout/error_callout';
import { FindingsSearchBar } from '../configurations/layout/findings_search_bar';
import { useFilteredDataView } from '../../common/api/use_filtered_data_view';
import { CVSScoreBadge, SeverityStatusBadge } from '../../components/vulnerability_badges';
import { EmptyState } from '../../components/empty_state';
import { VulnerabilityFindingFlyout } from './vulnerabilities_finding_flyout/vulnerability_finding_flyout';
import { NoVulnerabilitiesStates } from '../../components/no_vulnerabilities_states';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';

const getDefaultQuery = ({ query, filters }: any): any => ({
  query,
  filters,
  sort: [{ id: vulnerabilitiesColumns.cvss, direction: 'desc' }],
  pageIndex: 0,
});

export const Vulnerabilities = () => {
  const { data, isLoading, error } = useFilteredDataView(LATEST_VULNERABILITIES_INDEX_PATTERN);
  const getSetupStatus = useCspSetupStatusApi();

  if (getSetupStatus?.data?.vuln_mgmt.status !== 'indexed') return <NoVulnerabilitiesStates />;

  if (error) {
    return <ErrorCallout error={error as Error} />;
  }
  if (isLoading || !data) {
    return <EuiLoadingSpinner />;
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
    setUrlQuery,
    onResetFilters,
  } = useCloudPostureTable({
    dataView,
    defaultQuery: getDefaultQuery,
    paginationLocalStorageKey: LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY,
  });
  const { euiTheme } = useEuiTheme();

  const { data, isLoading } = useLatestVulnerabilities({
    query,
    sort,
    enabled: !queryError,
  });

  const [isVulnerabilityDetailFlyoutVisible, setIsVulnerabilityDetailFlyoutVisible] =
    useState(false);

  const [vulnerability, setVulnerability] = useState<VulnerabilityRecord>();

  const showFlyout = (vulnerabilityRecord: VulnerabilityRecord) => {
    setIsVulnerabilityDetailFlyoutVisible(true);
    setVulnerability(vulnerabilityRecord);
  };

  const hideFlyout = () => {
    setIsVulnerabilityDetailFlyoutVisible(false);
    setVulnerability(undefined);
  };

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
              showFlyout(vulnerabilityRow);
            }}
          />
        );
      }
      if (columnId === vulnerabilitiesColumns.vulnerability) {
        return vulnerabilityRow.vulnerability.id || null;
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
        if (
          !vulnerabilityRow.vulnerability.score?.base ||
          !vulnerabilityRow.vulnerability.severity
        ) {
          return null;
        }
        return (
          <SeverityStatusBadge
            score={vulnerabilityRow.vulnerability.score.base}
            status={vulnerabilityRow.vulnerability.severity}
          />
        );
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
        return (
          <>
            {vulnerabilityRow.vulnerability.package?.name}{' '}
            {vulnerabilityRow.vulnerability.package?.fixed_version}
          </>
        );
      }
    };
  }, [data?.page]);

  const error = queryError || null;

  if (error) {
    return <ErrorCallout error={error as Error} />;
  }
  if (isLoading || !data?.page) {
    return <EuiLoadingSpinner />;
  }

  const columns = getVulnerabilitiesColumnsGrid();

  return (
    <>
      <FindingsSearchBar
        dataView={dataView}
        setQuery={(newQuery) => {
          setUrlQuery({ ...newQuery, pageIndex: 0 });
        }}
        loading={isLoading}
      />
      <EuiSpacer size="l" />
      {!isLoading && data.page.length === 0 ? (
        <EmptyState onResetFilters={onResetFilters} />
      ) : (
        <>
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
            `}
            aria-label="Data grid styling demo"
            columns={columns}
            columnVisibility={{
              visibleColumns: columns.map(({ id }) => id),
              setVisibleColumns: () => {},
            }}
            rowCount={data?.total}
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
            inMemory={{ level: 'sorting' }}
            sorting={{ columns: sort, onSort }}
            pagination={{
              pageIndex,
              pageSize,
              pageSizeOptions: [10, 25, 100],
              onChangeItemsPerPage,
              onChangePage,
            }}
          />
          {/* Todo: Add Pagination */}
          {isVulnerabilityDetailFlyoutVisible && !!vulnerability && (
            <VulnerabilityFindingFlyout
              vulnerabilityRecord={vulnerability}
              closeFlyout={hideFlyout}
            />
          )}
        </>
      )}
    </>
  );
};
