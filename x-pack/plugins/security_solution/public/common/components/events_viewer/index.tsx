/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { inputsModel, inputsSelectors, State } from '../../store';
import { inputsActions } from '../../store/actions';
import { timelineSelectors, timelineActions } from '../../../timelines/store/timeline';
import {
  ColumnHeaderOptions,
  SubsetTimelineModel,
  TimelineModel,
} from '../../../timelines/store/timeline/model';
import { OnChangeItemsPerPage } from '../../../timelines/components/timeline/events';
import { Filter } from '../../../../../../../src/plugins/data/public';
import { useUiSetting } from '../../lib/kibana';
import { EventsViewer } from './events_viewer';
import { useFetchIndexPatterns } from '../../../detections/containers/detection_engine/rules/fetch_index_patterns';
import { InspectButtonContainer } from '../inspect';

export interface OwnProps {
  defaultIndices?: string[];
  defaultModel: SubsetTimelineModel;
  end: number;
  id: string;
  start: number;
  headerFilterGroup?: React.ReactNode;
  pageFilters?: Filter[];
  utilityBar?: (refetch: inputsModel.Refetch, totalCount: number) => React.ReactNode;
}

type Props = OwnProps & PropsFromRedux;

const StatefulEventsViewerComponent: React.FC<Props> = ({
  createTimeline,
  columns,
  dataProviders,
  deletedEventIds,
  defaultIndices,
  deleteEventQuery,
  end,
  filters,
  headerFilterGroup,
  id,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  pageFilters,
  query,
  removeColumn,
  start,
  showCheckboxes,
  showRowRenderers,
  sort,
  updateItemsPerPage,
  upsertColumn,
  utilityBar,
}) => {
  const [{ browserFields, indexPatterns }] = useFetchIndexPatterns(
    defaultIndices ?? useUiSetting<string[]>(DEFAULT_INDEX_KEY)
  );

  useEffect(() => {
    if (createTimeline != null) {
      createTimeline({ id, columns, sort, itemsPerPage, showCheckboxes, showRowRenderers });
    }
    return () => {
      deleteEventQuery({ id, inputId: 'global' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeItemsPerPage: OnChangeItemsPerPage = useCallback(
    (itemsChangedPerPage) => updateItemsPerPage({ id, itemsPerPage: itemsChangedPerPage }),
    [id, updateItemsPerPage]
  );

  const toggleColumn = useCallback(
    (column: ColumnHeaderOptions) => {
      const exists = columns.findIndex((c) => c.id === column.id) !== -1;

      if (!exists && upsertColumn != null) {
        upsertColumn({
          column,
          id,
          index: 1,
        });
      }

      if (exists && removeColumn != null) {
        removeColumn({
          columnId: column.id,
          id,
        });
      }
    },
    [columns, id, upsertColumn, removeColumn]
  );

  const globalFilters = useMemo(() => [...filters, ...(pageFilters ?? [])], [filters, pageFilters]);

  return (
    <InspectButtonContainer>
      <EventsViewer
        browserFields={browserFields}
        columns={columns}
        id={id}
        dataProviders={dataProviders!}
        deletedEventIds={deletedEventIds}
        end={end}
        filters={globalFilters}
        headerFilterGroup={headerFilterGroup}
        indexPattern={indexPatterns}
        isLive={isLive}
        itemsPerPage={itemsPerPage!}
        itemsPerPageOptions={itemsPerPageOptions!}
        kqlMode={kqlMode}
        onChangeItemsPerPage={onChangeItemsPerPage}
        query={query}
        start={start}
        sort={sort!}
        toggleColumn={toggleColumn}
        utilityBar={utilityBar}
      />
    </InspectButtonContainer>
  );
};

const makeMapStateToProps = () => {
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getEvents = timelineSelectors.getEventsByIdSelector();
  const mapStateToProps = (state: State, { id, defaultModel }: OwnProps) => {
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const events: TimelineModel = getEvents(state, id) ?? defaultModel;
    const {
      columns,
      dataProviders,
      deletedEventIds,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      sort,
      showCheckboxes,
      showRowRenderers,
    } = events;

    return {
      columns,
      dataProviders,
      deletedEventIds,
      filters: getGlobalFiltersQuerySelector(state),
      id,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      query: getGlobalQuerySelector(state),
      sort,
      showCheckboxes,
      showRowRenderers,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  createTimeline: timelineActions.createTimeline,
  deleteEventQuery: inputsActions.deleteOneQuery,
  updateItemsPerPage: timelineActions.updateItemsPerPage,
  removeColumn: timelineActions.removeColumn,
  upsertColumn: timelineActions.upsertColumn,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulEventsViewer = connector(
  React.memo(
    StatefulEventsViewerComponent,
    (prevProps, nextProps) =>
      prevProps.id === nextProps.id &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.defaultIndices, nextProps.defaultIndices) &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      prevProps.deletedEventIds === nextProps.deletedEventIds &&
      prevProps.end === nextProps.end &&
      deepEqual(prevProps.filters, nextProps.filters) &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      prevProps.kqlMode === nextProps.kqlMode &&
      deepEqual(prevProps.query, nextProps.query) &&
      deepEqual(prevProps.sort, nextProps.sort) &&
      prevProps.start === nextProps.start &&
      deepEqual(prevProps.pageFilters, nextProps.pageFilters) &&
      prevProps.showCheckboxes === nextProps.showCheckboxes &&
      prevProps.showRowRenderers === nextProps.showRowRenderers &&
      prevProps.start === nextProps.start &&
      prevProps.utilityBar === nextProps.utilityBar
  )
);
