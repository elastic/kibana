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
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../common/constants';
import { useCloudPostureTable } from '../../common/hooks/use_cloud_posture_table';
import { useLatestVulnerabilities } from './hooks/use_latest_vulnerabilities';
import { VulnerabilityRecord } from './types';
import { getVulnerabilitiesColumns } from './utils';
import { LATEST_VULNERABILITIES_INDEX_PATTERN } from '../../../common/constants';
import { ErrorCallout } from '../configurations/layout/error_callout';
import { FindingsSearchBar } from '../configurations/layout/findings_search_bar';
import { useDataViewForIndexPattern } from '../../common/api/use_data_view_for_Index_pattern';

const getDefaultQuery = ({ query, filters }: any): any => ({
  query,
  filters,
  sort: [{ id: 'cvss', direction: 'desc' }],
  pageIndex: 0,
});

export const Vulnerabilities = () => {
  const {
    data: dataView,
    isLoading: dataViewIsLoading,
    error: dataViewError,
  } = useDataViewForIndexPattern(LATEST_VULNERABILITIES_INDEX_PATTERN);

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
    enabled: !queryError && !dataViewError,
  });

  const renderCellValue = useMemo(() => {
    return ({
      rowIndex,
      columnId,
    }: {
      rowIndex: number;
      columnId: typeof columns[number]['id'];
    }) => {
      const vulnerability = data?.page[rowIndex] as VulnerabilityRecord;

      if (!vulnerability) return null;

      if (columnId === 'actions') {
        return (
          <EuiButtonIcon
            iconType="expand"
            aria-label="View"
            onClick={() => {
              alert(`Flyout id ${vulnerability.finding?.vulnerability?.id}`);
            }}
          />
        );
      }
      if (columnId === 'vulnerability') {
        return vulnerability.finding?.vulnerability?.id || null;
      }
      if (columnId === 'cvss') {
        return (
          <>
            {vulnerability.finding?.vulnerability.score.base}|
            {vulnerability.finding?.vulnerability.score.version}
          </>
        );
      }
      if (columnId === 'resource') {
        return vulnerability.resource?.name || null;
      }
      if (columnId === 'severity') {
        return <>{vulnerability.finding?.vulnerability.severity || null}</>;
      }
      if (columnId === 'package-version') {
        return (
          <>
            {vulnerability.finding?.vulnerability.package.name}{' '}
            {vulnerability.finding?.vulnerability.package.version}
          </>
        );
      }
      if (columnId === 'fix-version') {
        return (
          <>
            {vulnerability.finding?.vulnerability.package.name}{' '}
            {vulnerability.finding?.vulnerability.package.fixed_version}
          </>
        );
      }
    };
  }, [data?.page]);

  const error = queryError || dataViewError || null;

  if (error) {
    return <ErrorCallout error={error as Error} />;
  }
  if (dataViewIsLoading || isLoading || !data || !dataView) {
    return <EuiLoadingSpinner />;
  }

  const columns = getVulnerabilitiesColumns();

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
