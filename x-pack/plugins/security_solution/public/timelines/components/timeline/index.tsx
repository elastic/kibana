/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import React, { useEffect, useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { inputsModel, inputsSelectors, State } from '../../../common/store';
import { timelineActions, timelineSelectors } from '../../store/timeline';
import { ColumnHeaderOptions, TimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { defaultHeaders } from './body/column_headers/default_headers';
import { OnChangeItemsPerPage } from './events';
import { Timeline } from './timeline';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';

export interface OwnProps {
  id: string;
  onClose: () => void;
  usersViewing: string[];
}

export type Props = OwnProps & PropsFromRedux;

const isTimerangeSame = (prevProps: Props, nextProps: Props) =>
  prevProps.end === nextProps.end &&
  prevProps.start === nextProps.start &&
  prevProps.timerangeKind === nextProps.timerangeKind;

const StatefulTimelineComponent = React.memo<Props>(
  ({
    columns,
    createTimeline,
    dataProviders,
    end,
    filters,
    graphEventId,
    id,
    isLive,
    isSaving,
    isTimelineExists,
    itemsPerPage,
    itemsPerPageOptions,
    kqlMode,
    kqlQueryExpression,
    onClose,
    removeColumn,
    show,
    showCallOutUnauthorizedMsg,
    sort,
    start,
    status,
    timelineType,
    timerangeKind,
    updateItemsPerPage,
    upsertColumn,
    usersViewing,
  }) => {
    const {
      browserFields,
      docValueFields,
      loading,
      indexPattern,
      selectedPatterns,
    } = useSourcererScope(SourcererScopeName.timeline);

    const onChangeItemsPerPage: OnChangeItemsPerPage = useCallback(
      (itemsChangedPerPage) => updateItemsPerPage!({ id, itemsPerPage: itemsChangedPerPage }),
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
      [columns, id, removeColumn, upsertColumn]
    );

    useEffect(() => {
      if (createTimeline != null && !isTimelineExists) {
        createTimeline({ id, columns: defaultHeaders, indexNames: selectedPatterns, show: false });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Timeline
        browserFields={browserFields}
        columns={columns}
        dataProviders={dataProviders!}
        docValueFields={docValueFields}
        end={end}
        filters={filters}
        graphEventId={graphEventId}
        id={id}
        indexPattern={indexPattern}
        indexNames={selectedPatterns}
        isLive={isLive}
        isSaving={isSaving}
        itemsPerPage={itemsPerPage!}
        itemsPerPageOptions={itemsPerPageOptions!}
        kqlMode={kqlMode}
        kqlQueryExpression={kqlQueryExpression}
        loadingSourcerer={loading}
        onChangeItemsPerPage={onChangeItemsPerPage}
        onClose={onClose}
        show={show!}
        showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
        sort={sort!}
        start={start}
        status={status}
        toggleColumn={toggleColumn}
        timelineType={timelineType}
        timerangeKind={timerangeKind}
        usersViewing={usersViewing}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      isTimerangeSame(prevProps, nextProps) &&
      prevProps.graphEventId === nextProps.graphEventId &&
      prevProps.id === nextProps.id &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.isSaving === nextProps.isSaving &&
      prevProps.isTimelineExists === nextProps.isTimelineExists &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.kqlMode === nextProps.kqlMode &&
      prevProps.kqlQueryExpression === nextProps.kqlQueryExpression &&
      prevProps.show === nextProps.show &&
      prevProps.showCallOutUnauthorizedMsg === nextProps.showCallOutUnauthorizedMsg &&
      prevProps.timelineType === nextProps.timelineType &&
      prevProps.status === nextProps.status &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      deepEqual(prevProps.filters, nextProps.filters) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      deepEqual(prevProps.sort, nextProps.sort) &&
      deepEqual(prevProps.usersViewing, nextProps.usersViewing)
    );
  }
);

StatefulTimelineComponent.displayName = 'StatefulTimelineComponent';

const makeMapStateToProps = () => {
  const getShowCallOutUnauthorizedMsg = timelineSelectors.getShowCallOutUnauthorizedMsg();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterQuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, id) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const {
      columns,
      dataProviders,
      eventType,
      filters,
      graphEventId,
      itemsPerPage,
      itemsPerPageOptions,
      isSaving,
      kqlMode,
      show,
      sort,
      status,
      timelineType,
    } = timeline;
    const kqlQueryTimeline = getKqlQueryTimeline(state, id)!;
    const timelineFilter = kqlMode === 'filter' ? filters || [] : [];

    // return events on empty search
    const kqlQueryExpression =
      isEmpty(dataProviders) && isEmpty(kqlQueryTimeline) && timelineType === 'template'
        ? ' '
        : kqlQueryTimeline;
    return {
      columns,
      dataProviders,
      eventType,
      end: input.timerange.to,
      filters: timelineFilter,
      graphEventId,
      id,
      isLive: input.policy.kind === 'interval',
      isSaving,
      isTimelineExists: getTimeline(state, id) != null,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      kqlQueryExpression,
      show,
      showCallOutUnauthorizedMsg: getShowCallOutUnauthorizedMsg(state),
      sort,
      start: input.timerange.from,
      status,
      timelineType,
      timerangeKind: input.timerange.kind,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  addProvider: timelineActions.addProvider,
  createTimeline: timelineActions.createTimeline,
  removeColumn: timelineActions.removeColumn,
  updateColumns: timelineActions.updateColumns,
  updateHighlightedDropAndProviderId: timelineActions.updateHighlightedDropAndProviderId,
  updateItemsPerPage: timelineActions.updateItemsPerPage,
  updateItemsPerPageOptions: timelineActions.updateItemsPerPageOptions,
  updateSort: timelineActions.updateSort,
  upsertColumn: timelineActions.upsertColumn,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulTimeline = connector(StatefulTimelineComponent);
