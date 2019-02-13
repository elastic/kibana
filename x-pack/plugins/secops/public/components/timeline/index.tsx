/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { WithSource } from '../../containers/source';
import { IndexType } from '../../graphql/types';
import { Note } from '../../lib/note';
import {
  appActions,
  appSelectors,
  State,
  timelineActions,
  timelineModel,
  timelineSelectors,
} from '../../store';
import { AddNoteToEvent, UpdateNote } from '../notes/helpers';
import { ColumnHeader } from './body/column_headers/column_header';
import { defaultHeaders } from './body/column_headers/headers';
import { columnRenderers, rowRenderers } from './body/renderers';
import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnChangeItemsPerPage,
  OnColumnSorted,
  OnDataProviderRemoved,
  OnPinEvent,
  OnRangeSelected,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
  OnUnPinEvent,
} from './events';
import { Timeline } from './timeline';

export interface OwnProps {
  id: string;
  flyoutHeaderHeight: number;
  flyoutHeight: number;
}

interface StateReduxProps {
  activePage?: number;
  dataProviders?: DataProvider[];
  eventIdToNoteIds?: { [eventId: string]: string[] };
  getNotesByIds: (noteIds: string[]) => Note[];
  headers?: ColumnHeader[];
  itemsPerPage?: number;
  itemsPerPageOptions?: number[];
  kqlMode: timelineModel.KqlMode;
  kqlQueryExpression: string;
  pageCount?: number;
  pinnedEventIds?: { [eventId: string]: boolean };
  range?: string;
  sort?: Sort;
  show?: boolean;
}

interface DispatchProps {
  addNoteToEvent?: ActionCreator<{ id: string; noteId: string; eventId: string }>;
  createTimeline?: ActionCreator<{ id: string }>;
  addProvider?: ActionCreator<{
    id: string;
    provider: DataProvider;
  }>;
  pinEvent?: ActionCreator<{
    id: string;
    eventId: string;
  }>;
  unPinEvent?: ActionCreator<{
    id: string;
    eventId: string;
  }>;
  updateProviders?: ActionCreator<{
    id: string;
    providers: DataProvider[];
  }>;
  updateRange?: ActionCreator<{
    id: string;
    range: string;
  }>;
  updateSort?: ActionCreator<{
    id: string;
    sort: Sort;
  }>;
  removeProvider?: ActionCreator<{
    id: string;
    providerId: string;
    andProviderId?: string;
  }>;
  updateDataProviderEnabled?: ActionCreator<{
    id: string;
    providerId: string;
    enabled: boolean;
    andProviderId?: string;
  }>;
  updateDataProviderExcluded?: ActionCreator<{
    id: string;
    excluded: boolean;
    providerId: string;
    andProviderId?: string;
  }>;
  updateDataProviderKqlQuery?: ActionCreator<{
    id: string;
    kqlQuery: string;
    providerId: string;
  }>;
  updateItemsPerPage?: ActionCreator<{
    id: string;
    itemsPerPage: number;
  }>;
  updateNote?: ActionCreator<{ note: Note }>;
  updateItemsPerPageOptions?: ActionCreator<{
    id: string;
    itemsPerPageOptions: number[];
  }>;
  updatePageIndex?: ActionCreator<{
    id: string;
    activePage: number;
  }>;
  updateHighlightedDropAndProviderId?: ActionCreator<{
    id: string;
    providerId: string;
  }>;
}

type Props = OwnProps & StateReduxProps & DispatchProps;

class StatefulTimelineComponent extends React.PureComponent<Props> {
  public componentDidMount() {
    const { createTimeline, id } = this.props;

    createTimeline!({ id });
  }

  public render() {
    const {
      dataProviders,
      eventIdToNoteIds,
      getNotesByIds,
      flyoutHeight,
      flyoutHeaderHeight,
      headers,
      id,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      kqlQueryExpression,
      pinnedEventIds,
      range,
      show,
      sort,
    } = this.props;

    return (
      <WithSource sourceId="default" indexTypes={[IndexType.ANY]}>
        {({ indexPattern }) => (
          <Timeline
            addNoteToEvent={this.onAddNoteToEvent}
            columnHeaders={headers!}
            columnRenderers={columnRenderers}
            eventIdToNoteIds={eventIdToNoteIds!}
            getNotesByIds={getNotesByIds}
            id={id}
            dataProviders={dataProviders!}
            flyoutHeaderHeight={flyoutHeaderHeight}
            flyoutHeight={flyoutHeight}
            indexPattern={indexPattern}
            itemsPerPage={itemsPerPage!}
            itemsPerPageOptions={itemsPerPageOptions!}
            kqlMode={kqlMode}
            kqlQuery={kqlQueryExpression}
            onChangeDataProviderKqlQuery={this.onChangeDataProviderKqlQuery}
            onChangeDroppableAndProvider={this.onChangeDroppableAndProvider}
            onChangeItemsPerPage={this.onChangeItemsPerPage}
            onColumnSorted={this.onColumnSorted}
            onDataProviderRemoved={this.onDataProviderRemoved}
            onFilterChange={noop} // TODO: this is the callback for column filters, which is out scope for this phase of delivery
            onPinEvent={this.onPinEvent}
            onUnPinEvent={this.onUnPinEvent}
            onRangeSelected={this.onRangeSelected}
            onToggleDataProviderEnabled={this.onToggleDataProviderEnabled}
            onToggleDataProviderExcluded={this.onToggleDataProviderExcluded}
            pinnedEventIds={pinnedEventIds!}
            range={range!}
            rowRenderers={rowRenderers}
            show={show!}
            sort={sort!}
            updateNote={this.onUpdateNote}
          />
        )}
      </WithSource>
    );
  }

  private onAddNoteToEvent: AddNoteToEvent = ({
    eventId,
    noteId,
  }: {
    eventId: string;
    noteId: string;
  }) => this.props.addNoteToEvent!({ id: this.props.id, eventId, noteId });

  private onColumnSorted: OnColumnSorted = sorted =>
    this.props.updateSort!({ id: this.props.id, sort: sorted });

  private onDataProviderRemoved: OnDataProviderRemoved = (
    providerId: string,
    andProviderId?: string
  ) => this.props.removeProvider!({ id: this.props.id, providerId, andProviderId });

  private onRangeSelected: OnRangeSelected = selectedRange =>
    this.props.updateRange!({ id: this.props.id, range: selectedRange });

  private onToggleDataProviderEnabled: OnToggleDataProviderEnabled = ({
    providerId,
    enabled,
    andProviderId,
  }) =>
    this.props.updateDataProviderEnabled!({
      id: this.props.id,
      enabled,
      providerId,
      andProviderId,
    });

  private onToggleDataProviderExcluded: OnToggleDataProviderExcluded = ({
    providerId,
    excluded,
    andProviderId,
  }) =>
    this.props.updateDataProviderExcluded!({
      id: this.props.id,
      excluded,
      providerId,
      andProviderId,
    });

  private onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery = ({ providerId, kqlQuery }) =>
    this.props.updateDataProviderKqlQuery!({ id: this.props.id, kqlQuery, providerId });

  private onChangeItemsPerPage: OnChangeItemsPerPage = itemsChangedPerPage =>
    this.props.updateItemsPerPage!({ id: this.props.id, itemsPerPage: itemsChangedPerPage });

  private onChangeDroppableAndProvider: OnChangeDroppableAndProvider = providerId =>
    this.props.updateHighlightedDropAndProviderId!({ id: this.props.id, providerId });

  private onPinEvent: OnPinEvent = eventId => this.props.pinEvent!({ id: this.props.id, eventId });

  private onUnPinEvent: OnUnPinEvent = eventId =>
    this.props.unPinEvent!({ id: this.props.id, eventId });

  private onUpdateNote: UpdateNote = (note: Note) => this.props.updateNote!({ note });
}

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterQuerySelector();
  const getNotesByIds = appSelectors.notesByIdsSelector();
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const timeline: timelineModel.TimelineModel = getTimeline(state, id);
    const {
      dataProviders,
      eventIdToNoteIds,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      pinnedEventIds,
      sort,
      show,
    } = timeline;
    const kqlQueryExpression = getKqlQueryTimeline(state, id);

    return {
      dataProviders,
      headers: defaultHeaders,
      id,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      kqlQueryExpression,
      eventIdToNoteIds,
      getNotesByIds: getNotesByIds(state),
      pinnedEventIds,
      sort,
      show,
    };
  };
  return mapStateToProps;
};

export const StatefulTimeline = connect(
  makeMapStateToProps,
  {
    addNoteToEvent: timelineActions.addNoteToEvent,
    addProvider: timelineActions.addProvider,
    createTimeline: timelineActions.createTimeline,
    unPinEvent: timelineActions.unPinEvent,
    updateProviders: timelineActions.updateProviders,
    updateRange: timelineActions.updateRange,
    updateSort: timelineActions.updateSort,
    updateDataProviderEnabled: timelineActions.updateDataProviderEnabled,
    updateDataProviderExcluded: timelineActions.updateDataProviderExcluded,
    updateDataProviderKqlQuery: timelineActions.updateDataProviderKqlQuery,
    updateHighlightedDropAndProviderId: timelineActions.updateHighlightedDropAndProviderId,
    updateItemsPerPage: timelineActions.updateItemsPerPage,
    updateItemsPerPageOptions: timelineActions.updateItemsPerPageOptions,
    pinEvent: timelineActions.pinEvent,
    removeProvider: timelineActions.removeProvider,
    updateNote: appActions.updateNote,
  }
)(StatefulTimelineComponent);
