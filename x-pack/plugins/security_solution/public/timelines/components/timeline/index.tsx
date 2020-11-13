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
import { TimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { defaultHeaders } from './body/column_headers/default_headers';
import { OnChangeItemsPerPage } from './events';
import { Timeline } from './timeline';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { inputsActions } from '../../../common/store/inputs';

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
    isDatePickerLocked,
    isLive,
    isSaving,
    isTimelineExists,
    itemsPerPage,
    itemsPerPageOptions,
    kqlMode,
    kqlQueryExpression,
    onClose,
    noteIds,
    show,
    showCallOutUnauthorizedMsg,
    sort,
    start,
    status,
    timelineType,
    timerangeKind,
    toggleLock,
    updateItemsPerPage,
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
        isDatePickerLocked={isDatePickerLocked}
        isLive={isLive}
        isSaving={isSaving}
        itemsPerPage={itemsPerPage!}
        itemsPerPageOptions={itemsPerPageOptions!}
        kqlMode={kqlMode}
        kqlQueryExpression={kqlQueryExpression}
        loadingSourcerer={loading}
        noteIds={noteIds}
        onChangeItemsPerPage={onChangeItemsPerPage}
        onClose={onClose}
        show={show!}
        showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
        sort={sort!}
        start={start}
        status={status}
        timelineType={timelineType}
        timerangeKind={timerangeKind}
        toggleLock={toggleLock}
        usersViewing={usersViewing}
      />
    );
  },
  // eslint-disable-next-line complexity
  (prevProps, nextProps) =>
    isTimerangeSame(prevProps, nextProps) &&
    prevProps.graphEventId === nextProps.graphEventId &&
    prevProps.id === nextProps.id &&
    prevProps.isDatePickerLocked === nextProps.isDatePickerLocked &&
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
    deepEqual(prevProps.noteIds, nextProps.noteIds) &&
    deepEqual(prevProps.columns, nextProps.columns) &&
    deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
    deepEqual(prevProps.filters, nextProps.filters) &&
    deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
    deepEqual(prevProps.sort, nextProps.sort) &&
    deepEqual(prevProps.usersViewing, nextProps.usersViewing)
);

StatefulTimelineComponent.displayName = 'StatefulTimelineComponent';

const makeMapStateToProps = () => {
  const getShowCallOutUnauthorizedMsg = timelineSelectors.getShowCallOutUnauthorizedMsg();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterQuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getGlobalInput = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, id) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const globalInput: inputsModel.InputsRange = getGlobalInput(state);
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
      noteIds,
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
      isDatePickerLocked: globalInput.linkTo.includes('timeline'),
      isLive: input.policy.kind === 'interval',
      isSaving,
      isTimelineExists: getTimeline(state, id) != null,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      kqlQueryExpression,
      noteIds,
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
  createTimeline: timelineActions.createTimeline,
  toggleLock: inputsActions.toggleTimelineLinkTo,
  updateColumns: timelineActions.updateColumns,
  updateItemsPerPage: timelineActions.updateItemsPerPage,
  updateItemsPerPageOptions: timelineActions.updateItemsPerPageOptions,
  updateSort: timelineActions.updateSort,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulTimeline = connector(StatefulTimelineComponent);
