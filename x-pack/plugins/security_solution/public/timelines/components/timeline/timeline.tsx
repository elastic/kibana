/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyoutHeader, EuiFlyoutBody, EuiFlyoutFooter, EuiProgress } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';

import { FlyoutHeaderWithCloseButton } from '../flyout/header_with_close_button';
import { BrowserFields, DocValueFields } from '../../../common/containers/source';
import { Direction } from '../../../../common/search_strategy';
import { useTimelineEvents } from '../../containers/index';
import { useKibana } from '../../../common/lib/kibana';
import { ColumnHeaderOptions, KqlMode, EventType } from '../../../timelines/store/timeline/model';
import { defaultHeaders } from './body/column_headers/default_headers';
import { Sort } from './body/sort';
import { StatefulBody } from './body/stateful_body';
import { DataProvider } from './data_providers/data_provider';
import { OnChangeItemsPerPage } from './events';
import { TimelineKqlFetch } from './fetch_kql_timeline';
import { Footer, footerHeight } from './footer';
import { TimelineHeader } from './header';
import { combineQueries } from './helpers';
import { TimelineRefetch } from './refetch_timeline';
import { TIMELINE_TEMPLATE } from './translations';
import {
  esQuery,
  Filter,
  FilterManager,
  IIndexPattern,
} from '../../../../../../../src/plugins/data/public';
import { useManageTimeline } from '../manage_timeline';
import { TimelineType, TimelineStatusLiteral } from '../../../../common/types/timeline';
import { requiredFieldsForActions } from '../../../detections/components/alerts_table/default_config';

const TimelineContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const TimelineHeaderContainer = styled.div`
  margin-top: 6px;
  width: 100%;
`;

TimelineHeaderContainer.displayName = 'TimelineHeaderContainer';

const StyledEuiFlyoutHeader = styled(EuiFlyoutHeader)`
  align-items: center;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  padding: 14px 10px 0 12px;
`;

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  overflow-y: hidden;
  flex: 1;

  .euiFlyoutBody__overflow {
    overflow: hidden;
    mask-image: none;
  }

  .euiFlyoutBody__overflowContent {
    padding: 0 10px 0 12px;
    height: 100%;
    display: flex;
  }
`;

const StyledEuiFlyoutFooter = styled(EuiFlyoutFooter)`
  background: none;
  padding: 0 10px 5px 12px;
`;

const TimelineTemplateBadge = styled.div`
  background: ${({ theme }) => theme.eui.euiColorVis3_behindText};
  color: #fff;
  padding: 10px 15px;
  font-size: 0.8em;
`;

export interface Props {
  browserFields: BrowserFields;
  columns: ColumnHeaderOptions[];
  dataProviders: DataProvider[];
  docValueFields: DocValueFields[];
  end: string;
  eventType?: EventType;
  filters: Filter[];
  graphEventId?: string;
  id: string;
  indexPattern: IIndexPattern;
  indexToAdd: string[];
  isLive: boolean;
  isLoadingSource: boolean;
  isSaving: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: KqlMode;
  kqlQueryExpression: string;
  loadingIndexName: boolean;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onClose: () => void;
  show: boolean;
  showCallOutUnauthorizedMsg: boolean;
  start: string;
  sort: Sort;
  status: TimelineStatusLiteral;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  usersViewing: string[];
  timelineType: TimelineType;
}

/** The parent Timeline component */
export const TimelineComponent: React.FC<Props> = ({
  browserFields,
  columns,
  dataProviders,
  docValueFields,
  end,
  eventType,
  filters,
  graphEventId,
  id,
  indexPattern,
  indexToAdd,
  isLive,
  isLoadingSource,
  isSaving,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  kqlQueryExpression,
  loadingIndexName,
  onChangeItemsPerPage,
  onClose,
  show,
  showCallOutUnauthorizedMsg,
  start,
  status,
  sort,
  timelineType,
  toggleColumn,
  usersViewing,
}) => {
  const kibana = useKibana();
  const [filterManager] = useState<FilterManager>(new FilterManager(kibana.services.uiSettings));
  const esQueryConfig = useMemo(() => esQuery.getEsQueryConfig(kibana.services.uiSettings), [
    kibana.services.uiSettings,
  ]);
  const kqlQuery = useMemo(() => ({ query: kqlQueryExpression, language: 'kuery' }), [
    kqlQueryExpression,
  ]);
  const combinedQueries = useMemo(
    () =>
      combineQueries({
        config: esQueryConfig,
        dataProviders,
        indexPattern,
        browserFields,
        filters,
        kqlQuery,
        kqlMode,
        start,
        end,
      }),
    [
      browserFields,
      dataProviders,
      esQueryConfig,
      start,
      end,
      filters,
      indexPattern,
      kqlMode,
      kqlQuery,
    ]
  );

  const canQueryTimeline = useMemo(
    () =>
      combinedQueries != null &&
      isLoadingSource != null &&
      !isLoadingSource &&
      !isEmpty(start) &&
      !isEmpty(end),
    [isLoadingSource, combinedQueries, start, end]
  );
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const timelineQueryFields = useMemo(() => {
    const columnFields = columnsHeader.map((c) => c.id);
    return [...columnFields, ...requiredFieldsForActions];
  }, [columnsHeader]);
  const timelineQuerySortField = useMemo(
    () => ({
      field: sort.columnId,
      direction: sort.sortDirection as Direction,
    }),
    [sort.columnId, sort.sortDirection]
  );
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const { initializeTimeline, setIndexToAdd, setIsTimelineLoading } = useManageTimeline();

  useEffect(() => {
    initializeTimeline({
      filterManager,
      id,
      indexToAdd,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [
    loading,
    { events, inspect, totalCount, pageInfo, loadPage, updatedAt, refetch },
  ] = useTimelineEvents({
    docValueFields,
    endDate: end,
    eventType,
    id,
    indexToAdd,
    fields: timelineQueryFields,
    limit: itemsPerPage,
    filterQuery: combinedQueries?.filterQuery ?? '',
    startDate: start,
    skip: canQueryTimeline,
    sort: timelineQuerySortField,
  });

  useEffect(() => {
    setIsTimelineLoading({ id, isLoading: isQueryLoading || loadingIndexName });
  }, [loadingIndexName, id, isQueryLoading, setIsTimelineLoading]);

  useEffect(() => {
    setIndexToAdd({ id, indexToAdd });
  }, [id, indexToAdd, setIndexToAdd]);

  useEffect(() => {
    setIsQueryLoading(loading);
  }, [loading]);

  return (
    <TimelineContainer data-test-subj="timeline">
      {isSaving && <EuiProgress size="s" color="primary" position="absolute" />}
      {timelineType === TimelineType.template && (
        <TimelineTemplateBadge>{TIMELINE_TEMPLATE}</TimelineTemplateBadge>
      )}
      <StyledEuiFlyoutHeader data-test-subj="eui-flyout-header" hasBorder={false}>
        <FlyoutHeaderWithCloseButton
          onClose={onClose}
          timelineId={id}
          usersViewing={usersViewing}
        />
        <TimelineHeaderContainer data-test-subj="timelineHeader">
          <TimelineHeader
            browserFields={browserFields}
            indexPattern={indexPattern}
            dataProviders={dataProviders}
            filterManager={filterManager}
            graphEventId={graphEventId}
            show={show}
            showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
            timelineId={id}
            status={status}
          />
        </TimelineHeaderContainer>
      </StyledEuiFlyoutHeader>
      <TimelineKqlFetch id={id} indexPattern={indexPattern} inputId="timeline" />
      {canQueryTimeline ? (
        <>
          <TimelineRefetch
            id={id}
            inputId="timeline"
            inspect={inspect}
            loading={loading}
            refetch={refetch}
          />
          <StyledEuiFlyoutBody data-test-subj="eui-flyout-body" className="timeline-flyout-body">
            <StatefulBody
              browserFields={browserFields}
              data={events}
              docValueFields={docValueFields}
              id={id}
              refetch={refetch}
              sort={sort}
              toggleColumn={toggleColumn}
            />
          </StyledEuiFlyoutBody>
          {
            /** Hide the footer if Resolver is showing. */
            !graphEventId && (
              <StyledEuiFlyoutFooter
                data-test-subj="eui-flyout-footer"
                className="timeline-flyout-footer"
              >
                <Footer
                  activePage={pageInfo.activePage}
                  data-test-subj="timeline-footer"
                  updatedAt={updatedAt}
                  height={footerHeight}
                  id={id}
                  isLive={isLive}
                  isLoading={loading || loadingIndexName}
                  itemsCount={events.length}
                  itemsPerPage={itemsPerPage}
                  itemsPerPageOptions={itemsPerPageOptions}
                  onChangeItemsPerPage={onChangeItemsPerPage}
                  onChangePage={loadPage}
                  serverSideEventCount={totalCount}
                  totalPages={pageInfo.totalPages}
                />
              </StyledEuiFlyoutFooter>
            )
          }
        </>
      ) : null}
    </TimelineContainer>
  );
};

export const Timeline = React.memo(TimelineComponent);
