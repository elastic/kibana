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
import { State, timelineActions, timelineModel, timelineSelectors } from '../../store';
import { ColumnHeader } from './body/column_headers/column_header';
import { columnRenderers, rowRenderers } from './body/renderers';
import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnChangeItemsPerPage,
  OnColumnSorted,
  OnDataProviderRemoved,
  OnRangeSelected,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from './events';
import { Timeline } from './timeline';

export interface OwnProps {
  id: string;
  flyoutHeaderHeight: number;
  flyoutHeight: number;
  headers: ColumnHeader[];
}

interface StateReduxProps {
  activePage?: number;
  dataProviders?: DataProvider[];
  itemsPerPage?: number;
  itemsPerPageOptions?: number[];
  kqlQueryExpression: string;
  pageCount?: number;
  range?: string;
  sort?: Sort;
  show?: boolean;
}

interface DispatchProps {
  createTimeline?: ActionCreator<{ id: string }>;
  addProvider?: ActionCreator<{
    id: string;
    provider: DataProvider;
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
      flyoutHeight,
      flyoutHeaderHeight,
      headers,
      id,
      itemsPerPage,
      itemsPerPageOptions,
      kqlQueryExpression,
      range,
      removeProvider,
      show,
      sort,
      updateRange,
      updateSort,
      updateDataProviderEnabled,
      updateDataProviderExcluded,
      updateDataProviderKqlQuery,
      updateHighlightedDropAndProviderId,
      updateItemsPerPage,
    } = this.props;

    const onColumnSorted: OnColumnSorted = sorted => updateSort!({ id, sort: sorted });

    const onDataProviderRemoved: OnDataProviderRemoved = (
      providerId: string,
      andProviderId?: string
    ) => removeProvider!({ id, providerId, andProviderId });

    const onRangeSelected: OnRangeSelected = selectedRange =>
      updateRange!({ id, range: selectedRange });

    const onToggleDataProviderEnabled: OnToggleDataProviderEnabled = ({
      providerId,
      enabled,
      andProviderId,
    }) => updateDataProviderEnabled!({ id, enabled, providerId, andProviderId });

    const onToggleDataProviderExcluded: OnToggleDataProviderExcluded = ({
      providerId,
      excluded,
      andProviderId,
    }) => updateDataProviderExcluded!({ id, excluded, providerId, andProviderId });

    const onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery = ({ providerId, kqlQuery }) =>
      updateDataProviderKqlQuery!({ id, kqlQuery, providerId });

    const onChangeItemsPerPage: OnChangeItemsPerPage = itemsChangedPerPage =>
      updateItemsPerPage!({ id, itemsPerPage: itemsChangedPerPage });

    const onChangeDroppableAndProvider: OnChangeDroppableAndProvider = providerId =>
      updateHighlightedDropAndProviderId!({ id, providerId });

    return (
      <WithSource sourceId="default" indexTypes={[IndexType.ANY]}>
        {({ indexPattern }) => (
          <Timeline
            columnHeaders={headers}
            columnRenderers={columnRenderers}
            id={id}
            dataProviders={dataProviders!}
            flyoutHeaderHeight={flyoutHeaderHeight}
            flyoutHeight={flyoutHeight}
            itemsPerPage={itemsPerPage!}
            itemsPerPageOptions={itemsPerPageOptions!}
            kqlQuery={kqlQueryExpression}
            onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
            onChangeDroppableAndProvider={onChangeDroppableAndProvider}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onColumnSorted={onColumnSorted}
            onDataProviderRemoved={onDataProviderRemoved}
            onFilterChange={noop} // TODO: this is the callback for column filters, which is out scope for this phase of delivery
            onRangeSelected={onRangeSelected}
            onToggleDataProviderEnabled={onToggleDataProviderEnabled}
            onToggleDataProviderExcluded={onToggleDataProviderExcluded}
            range={range!}
            rowRenderers={rowRenderers}
            show={show!}
            sort={sort!}
            indexPattern={indexPattern}
          />
        )}
      </WithSource>
    );
  }
}

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterQuerySelector();
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const timeline: timelineModel.TimelineModel = getTimeline(state, id);
    const { dataProviders, itemsPerPage, itemsPerPageOptions, sort, show } = timeline;
    const kqlQueryExpression = getKqlQueryTimeline(state, id);
    return {
      dataProviders,
      id,
      itemsPerPage,
      itemsPerPageOptions,
      kqlQueryExpression,
      sort,
      show,
    };
  };
  return mapStateToProps;
};

export const StatefulTimeline = connect(
  makeMapStateToProps,
  {
    addProvider: timelineActions.addProvider,
    createTimeline: timelineActions.createTimeline,
    updateProviders: timelineActions.updateProviders,
    updateRange: timelineActions.updateRange,
    updateSort: timelineActions.updateSort,
    updateDataProviderEnabled: timelineActions.updateDataProviderEnabled,
    updateDataProviderExcluded: timelineActions.updateDataProviderExcluded,
    updateDataProviderKqlQuery: timelineActions.updateDataProviderKqlQuery,
    updateHighlightedDropAndProviderId: timelineActions.updateHighlightedDropAndProviderId,
    updateItemsPerPage: timelineActions.updateItemsPerPage,
    updateItemsPerPageOptions: timelineActions.updateItemsPerPageOptions,
    removeProvider: timelineActions.removeProvider,
  }
)(StatefulTimelineComponent);
