/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { getPaginationTableParams } from '../../../common/hooks/use_cloud_posture_table/utils';
import { useLimitProperties } from '../../../common/utils/get_limit_properties';
import type { Evaluation } from '../../../../common/types';
import type { FindingsBaseProps, FindingsBaseURLQuery } from '../../../common/types';
// import { FindingsTable } from './latest_findings_table';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import * as TEST_SUBJECTS from '../test_subjects';
import { useLatestFindings } from './use_latest_findings';
import type { FindingsGroupByNoneQuery } from './use_latest_findings';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import { getFindingsPageSizeInfo, getFilters } from '../utils/utils';
import { FindingsGroupBySelector } from '../layout/findings_group_by_selector';
import { ErrorCallout } from '../layout/error_callout';
import { LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY } from '../../../common/constants';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { useCloudPostureTable } from '../../../common/hooks/use_cloud_posture_table';
import {
  CloudSecurityDataGrid,
  CloudSecurityDefaultColumn,
} from '../../../components/cloud_security_data_grid';
import { FindingsRuleFlyout } from '../findings_flyout/findings_flyout';

export const getDefaultQuery = ({
  query,
  filters,
}: FindingsBaseURLQuery): FindingsBaseURLQuery &
  FindingsGroupByNoneQuery & { findingIndex: number } => ({
  query,
  filters,
  sort: { field: '@timestamp', direction: 'desc' },
  pageIndex: 0,
  findingIndex: -1,
});

const defaultColumns: CloudSecurityDefaultColumn[] = [
  { id: 'result.evaluation', displayName: 'result.evaluation' },
  { id: 'resource.id', displayName: 'resource.id' },
  { id: 'resource.name', displayName: 'resource.name' },
  { id: 'resource.sub_type', displayName: 'resource.sub_type' },
  { id: 'rule.benchmark.rule_number', displayName: 'rule.benchmark.rule_number' },
  { id: 'rule.name', displayName: 'rule.name' },
  { id: 'rule.section', displayName: 'rule.section' },
  { id: '@timestamp', displayName: '@timestamp' },
];

export const LatestFindingsContainer = ({ dataView }: FindingsBaseProps) => {
  const {
    pageIndex,
    query,
    sort,
    queryError,
    pageSize,
    urlQuery,
    setUrlQuery,
    filters,
    onChangeItemsPerPage,
  } = useCloudPostureTable({
    dataView,
    paginationLocalStorageKey: LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY,
  });

  /**
   * Page ES query result
   */
  const findingsGroupByNone = useLatestFindings({
    query,
    sort,
    enabled: !queryError,
  });

  const rows = useMemo(
    () => findingsGroupByNone.data?.page || [],
    [findingsGroupByNone.data?.page]
  );

  const sampleSize = findingsGroupByNone.data?.total || 0;

  const error = findingsGroupByNone.error || queryError;

  const { isLastLimitedPage, limitedTotalItemCount } = useLimitProperties({
    total: findingsGroupByNone.data?.total,
    pageIndex,
    pageSize,
  });

  const handleDistributionClick = (evaluation: Evaluation) => {
    setUrlQuery({
      pageIndex: 0,
      filters: getFilters({
        filters,
        dataView,
        field: 'result.evaluation',
        value: evaluation,
        negate: false,
      }),
    });
  };

  const flyoutFindingIndex = urlQuery?.findingIndex;

  const pagination = getPaginationTableParams({
    pageSize,
    pageIndex,
    totalItemCount: limitedTotalItemCount,
  });

  const onOpenFlyout = useCallback(
    (flyoutFinding: CspFinding) => {
      console.log({ flyoutFinding });
      setUrlQuery({
        findingIndex: (rows as unknown as CspFinding[]).findIndex(
          (finding) => finding.id === flyoutFinding?.id
        ),
      });
    },
    [rows, setUrlQuery]
  );

  const onCloseFlyout = () =>
    setUrlQuery({
      findingIndex: -1,
    });

  const onPaginateFlyout = useCallback(
    (nextFindingIndex: number) => {
      // the index of the finding in the current page
      const newFindingIndex = nextFindingIndex % pageSize;

      // if the finding is not in the current page, we need to change the page
      const flyoutPageIndex = Math.floor(nextFindingIndex / pageSize);

      setUrlQuery({
        pageIndex: flyoutPageIndex,
        findingIndex: newFindingIndex,
      });
    },
    [pageSize, setUrlQuery]
  );

  const renderDocumentView = useCallback(
    (hit: DataTableRecord, displayedRows: DataTableRecord[], displayedColumns: string[]) => (
      <FindingsRuleFlyout
        findings={hit.raw._source as CspFinding}
        onClose={onCloseFlyout}
        findingsCount={rows.length}
        flyoutIndex={flyoutFindingIndex + pagination.pageIndex * pagination.pageSize}
        onPaginate={onPaginateFlyout}
      />
    ),
    [
      flyoutFindingIndex,
      onCloseFlyout,
      onPaginateFlyout,
      pagination.pageIndex,
      pagination.pageSize,
      rows.length,
    ]
  );

  return (
    <div data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_CONTAINER}>
      <FindingsSearchBar
        dataView={dataView!}
        setQuery={(newQuery) => {
          setUrlQuery({ ...newQuery, pageIndex: 0 });
        }}
        loading={findingsGroupByNone.isFetching}
      />
      <EuiSpacer size="m" />
      {!error && (
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false} style={{ width: 188 }}>
            <FindingsGroupBySelector type="default" />
            <EuiSpacer size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {error && <ErrorCallout error={error} />}
      {!error && (
        <>
          {findingsGroupByNone.isSuccess && !!findingsGroupByNone.data.page.length && (
            <FindingsDistributionBar
              {...{
                distributionOnClick: handleDistributionClick,
                type: i18n.translate('xpack.csp.findings.latestFindings.tableRowTypeLabel', {
                  defaultMessage: 'Findings',
                }),
                total: findingsGroupByNone.data.total,
                passed: findingsGroupByNone.data.count.passed,
                failed: findingsGroupByNone.data.count.failed,
                ...getFindingsPageSizeInfo({
                  pageIndex,
                  pageSize,
                  currentPageSize: rows.length,
                }),
              }}
            />
          )}
          <EuiSpacer />
          <CloudSecurityDataGrid
            dataView={dataView}
            isLoading={findingsGroupByNone.isFetching}
            defaultColumns={defaultColumns}
            sort={[['@timestamp', 'desc']]}
            rows={rows}
            pageSize={pageSize}
            totalHits={rows.length}
            sampleSize={sampleSize}
            selectedRowIndex={flyoutFindingIndex}
            setExpandedDoc={onOpenFlyout}
            renderDocumentView={renderDocumentView}
            onUpdateRowsPerPage={onChangeItemsPerPage}
          />
          {/*
      settings={tableSettings}
      showTimeCol={true}
      isSortEnabled={true}
      sort={sortingColumns}
      rowHeightState={3}
      onUpdateRowHeight={(rowHeight: number) => {
        // Do the state update with the new setting of the row height
      }}
      isPlainRecord={isTextBasedQuery}
      rowsPerPageState={50}
      onUpdateRowsPerPage={(rowHeight: number) => {
        // Do the state update with the new number of the rows per page
      }
      onFieldEdited={() =>
        // Callback to execute on edit runtime field. Refetch data.
      }
      cellActionsTriggerId={SecurityCellActionsTrigger.DEFAULT}
      services={{
        theme,
        fieldFormats,
        storage,
        toastNotifications: toastsService,
        uiSettings,
        dataViewFieldEditor,
        data: dataPluginContract,
      }}
      visibleCellActions={3}
      externalCustomRenderers={{
        // Set the record style definition for the specific fields rendering Record<string,(props: EuiDataGridCellValueElementProps) => React.ReactNode>
      }}
      renderDocumentView={() =>
        // Implement similar callback to render the Document flyout
          const renderDetailsPanel = useCallback(
                () => (
                <DetailsPanel
                    browserFields={browserFields}
                    handleOnPanelClosed={handleOnPanelClosed}
                    runtimeMappings={runtimeMappings}
                    tabType={TimelineTabs.query}
                    scopeId={timelineId}
                    isFlyoutView
                />
                ),
                [browserFields, handleOnPanelClosed, runtimeMappings, timelineId]
            );
      }
      externalControlColumns={leadingControlColumns}
      externalAdditionalControls={additionalControls}
      trailingControlColumns={trailingControlColumns}
      renderCustomGridBody={renderCustomGridBody}
      rowsPerPageOptions={[10, 30, 40, 100]}
      showFullScreenButton={false}
      useNewFieldsApi={true}
      maxDocFieldsDisplayed={50}
      consumer="timeline"
      totalHits={
        // total number of the documents in the search query result. For example: 1200
      }
      onFetchMoreRecords={() => {
        // Do some data fetch to get more data
      }}
      configRowHeight={3}
      showMultiFields={true}
    />

          <FindingsTable
            onResetFilters={onResetFilters}
            onCloseFlyout={onCloseFlyout}
            onPaginateFlyout={onPaginateFlyout}
            onOpenFlyout={onOpenFlyout}
            flyoutFindingIndex={flyoutFindingIndex}
            loading={findingsGroupByNone.isFetching}
            items={slicedPage}
            pagination={pagination}
            sorting={{
              sort: { field: sort.field, direction: sort.direction },
            }}
            setTableOptions={setTableOptions}
            onAddFilter={(field, value, negate) =>
              setUrlQuery({
                pageIndex: 0,
                filters: getFilters({
                  filters,
                  dataView,
                  field,
                  value,
                  negate,
                }),
              })
            }
          /> */}
        </>
      )}
    </div>
  );
};
