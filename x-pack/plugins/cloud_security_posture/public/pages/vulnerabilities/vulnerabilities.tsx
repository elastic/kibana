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
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataView } from '@kbn/data-views-plugin/common';
import React, { useMemo } from 'react';
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

const getDefaultQuery = ({ query, filters }: any): any => ({
  query,
  filters,
  sort: [{ id: vulnerabilitiesColumns.cvss, direction: 'desc' }],
  pageIndex: 0,
});

export const Vulnerabilities = () => {
  const { data, isLoading, error } = useFilteredDataView(LATEST_VULNERABILITIES_INDEX_PATTERN);

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
              alert(`Flyout id ${vulnerabilityRow.vulnerability.id}`);
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
        <EuiEmptyPrompt
          iconType="logoKibana"
          title={
            <h2>
              <FormattedMessage
                id="xpack.csp.findings.resourceFindings.noFindingsTitle"
                defaultMessage="There are no Findings"
              />
            </h2>
          }
        />
      ) : (
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
                    {data?.total} Vulnerabilities
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
      )}
    </>
  );
};
