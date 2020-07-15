/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiBasicTable, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo, useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { TimelineType } from '../../../../common/types/timeline';
import { ImportDataModal } from '../../../common/components/import_data_modal';
import {
  UtilityBarGroup,
  UtilityBarText,
  UtilityBar,
  UtilityBarSection,
  UtilityBarAction,
} from '../../../common/components/utility_bar';

import { importTimelines } from '../../containers/api';

import { useEditTimelineBatchActions } from './edit_timeline_batch_actions';
import { useEditTimelineActions } from './edit_timeline_actions';
import { EditOneTimelineAction } from './export_timeline';
import { SearchRow } from './search_row';
import { TimelinesTable } from './timelines_table';
import * as i18n from './translations';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';
import { OpenTimelineProps, OpenTimelineResult, ActionTimelineToShow } from './types';

export const OpenTimeline = React.memo<OpenTimelineProps>(
  ({
    deleteTimelines,
    defaultPageSize,
    favoriteCount,
    isLoading,
    itemIdToExpandedNotesRowMap,
    importDataModalToggle,
    onDeleteSelected,
    onlyFavorites,
    onOpenTimeline,
    onQueryChange,
    onSelectionChange,
    onTableChange,
    onToggleOnlyFavorites,
    onToggleShowNotes,
    pageIndex,
    pageSize,
    query,
    refetch,
    searchResults,
    selectedItems,
    sortDirection,
    setImportDataModalToggle,
    sortField,
    timelineType = TimelineType.default,
    timelineFilter,
    templateTimelineFilter,
    totalSearchResultsCount,
  }) => {
    const tableRef = useRef<EuiBasicTable<OpenTimelineResult>>();
    const {
      actionItem,
      enableExportTimelineDownloader,
      isEnableDownloader,
      isDeleteTimelineModalOpen,
      onOpenDeleteTimelineModal,
      onCompleteEditTimelineAction,
    } = useEditTimelineActions();

    const { getBatchItemsPopoverContent } = useEditTimelineBatchActions({
      deleteTimelines,
      selectedItems,
      tableRef,
      timelineType,
    });

    const nTemplates = useMemo(
      () => (
        <FormattedMessage
          id="xpack.securitySolution.open.timeline.showingNTemplatesLabel"
          defaultMessage="{totalSearchResultsCount} {totalSearchResultsCount, plural, one {template} other {templates}} {with}"
          values={{
            totalSearchResultsCount,
            with: (
              <span data-test-subj="selectable-query-text">
                {query.trim().length ? `${i18n.WITH} "${query.trim()}"` : ''}
              </span>
            ),
          }}
        />
      ),
      [totalSearchResultsCount, query]
    );

    const nTimelines = useMemo(
      () => (
        <FormattedMessage
          id="xpack.securitySolution.open.timeline.showingNTimelinesLabel"
          defaultMessage="{totalSearchResultsCount} {totalSearchResultsCount, plural, one {timeline} other {timelines}} {with}"
          values={{
            totalSearchResultsCount,
            with: (
              <span data-test-subj="selectable-query-text">
                {query.trim().length ? `${i18n.WITH} "${query.trim()}"` : ''}
              </span>
            ),
          }}
        />
      ),
      [totalSearchResultsCount, query]
    );

    const actionItemId = useMemo(
      () =>
        actionItem != null && actionItem.savedObjectId != null ? [actionItem.savedObjectId] : [],
      [actionItem]
    );

    const onRefreshBtnClick = useCallback(() => {
      if (refetch != null) {
        refetch(searchResults, totalSearchResultsCount);
      }
    }, [refetch, searchResults, totalSearchResultsCount]);

    const handleCloseModal = useCallback(() => {
      if (setImportDataModalToggle != null) {
        setImportDataModalToggle(false);
      }
    }, [setImportDataModalToggle]);

    const handleComplete = useCallback(() => {
      if (setImportDataModalToggle != null) {
        setImportDataModalToggle(false);
      }
      if (refetch != null) {
        refetch(searchResults, totalSearchResultsCount);
      }
    }, [setImportDataModalToggle, refetch, searchResults, totalSearchResultsCount]);

    const actionTimelineToShow = useMemo<ActionTimelineToShow[]>(() => {
      const timelineActions: ActionTimelineToShow[] = [
        'createFrom',
        'duplicate',
        'export',
        'selectable',
      ];

      if (onDeleteSelected != null && deleteTimelines != null) {
        timelineActions.push('delete');
      }

      return timelineActions;
    }, [onDeleteSelected, deleteTimelines]);

    const SearchRowContent = useMemo(() => <>{templateTimelineFilter}</>, [templateTimelineFilter]);

    return (
      <>
        <EditOneTimelineAction
          deleteTimelines={deleteTimelines}
          ids={actionItemId}
          isDeleteTimelineModalOpen={isDeleteTimelineModalOpen}
          isEnableDownloader={isEnableDownloader}
          onComplete={onCompleteEditTimelineAction}
          title={actionItem?.title ?? i18n.UNTITLED_TIMELINE}
        />
        <ImportDataModal
          checkBoxLabel={i18n.OVERWRITE_WITH_SAME_NAME}
          closeModal={handleCloseModal}
          description={i18n.SELECT_TIMELINE}
          errorMessage={i18n.IMPORT_FAILED}
          failedDetailed={i18n.IMPORT_FAILED_DETAILED}
          importComplete={handleComplete}
          importData={importTimelines}
          successMessage={i18n.SUCCESSFULLY_IMPORTED_TIMELINES}
          showCheckBox={false}
          showModal={importDataModalToggle ?? false}
          submitBtnText={i18n.IMPORT_TIMELINE_BTN_TITLE}
          subtitle={i18n.INITIAL_PROMPT_TEXT}
          title={i18n.IMPORT_TIMELINE}
        />

        <EuiPanel className={OPEN_TIMELINE_CLASS_NAME}>
          <EuiSpacer size="m" />
          {!!timelineFilter && timelineFilter}
          <SearchRow
            data-test-subj="search-row"
            favoriteCount={favoriteCount}
            onlyFavorites={onlyFavorites}
            onQueryChange={onQueryChange}
            onToggleOnlyFavorites={onToggleOnlyFavorites}
            query={query}
            timelineType={timelineType}
          >
            {SearchRowContent}
          </SearchRow>

          <UtilityBar border>
            <UtilityBarSection>
              <UtilityBarGroup>
                <UtilityBarText data-test-subj="query-message">
                  <>
                    {i18n.SHOWING}{' '}
                    {timelineType === TimelineType.template ? nTemplates : nTimelines}
                  </>
                </UtilityBarText>
              </UtilityBarGroup>

              <UtilityBarGroup>
                <UtilityBarText>
                  {timelineType === TimelineType.template
                    ? i18n.SELECTED_TEMPLATES(selectedItems.length)
                    : i18n.SELECTED_TIMELINES(selectedItems.length)}
                </UtilityBarText>
                <UtilityBarAction
                  iconSide="right"
                  iconType="arrowDown"
                  popoverContent={getBatchItemsPopoverContent}
                >
                  {i18n.BATCH_ACTIONS}
                </UtilityBarAction>
                <UtilityBarAction iconSide="right" iconType="refresh" onClick={onRefreshBtnClick}>
                  {i18n.REFRESH}
                </UtilityBarAction>
              </UtilityBarGroup>
            </UtilityBarSection>
          </UtilityBar>

          <TimelinesTable
            actionTimelineToShow={actionTimelineToShow}
            data-test-subj="timelines-table"
            deleteTimelines={deleteTimelines}
            defaultPageSize={defaultPageSize}
            loading={isLoading}
            itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
            enableExportTimelineDownloader={enableExportTimelineDownloader}
            onOpenDeleteTimelineModal={onOpenDeleteTimelineModal}
            onOpenTimeline={onOpenTimeline}
            onSelectionChange={onSelectionChange}
            onTableChange={onTableChange}
            onToggleShowNotes={onToggleShowNotes}
            pageIndex={pageIndex}
            pageSize={pageSize}
            searchResults={searchResults}
            showExtendedColumns={true}
            sortDirection={sortDirection}
            sortField={sortField}
            timelineType={timelineType}
            tableRef={tableRef}
            totalSearchResultsCount={totalSearchResultsCount}
          />
        </EuiPanel>
      </>
    );
  }
);

OpenTimeline.displayName = 'OpenTimeline';
