/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { WithSource } from '../../containers/source';
import { IndexType } from '../../graphql/types';
import { inputsModel, inputsSelectors, State, timelineSelectors } from '../../store';

import { ColumnHeader } from './body/column_headers/column_header';
import { DataProvider } from './data_providers/data_provider';
import { defaultHeaders } from './body/column_headers/default_headers';
import { Sort } from './body/sort';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnChangeItemsPerPage,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from './events';
import { Timeline } from './timeline';
import { timelineActions } from '../../store/actions';
import { KqlMode, TimelineModel } from '../../store/timeline/model';

const indexTypes = [IndexType.ANY];

export interface OwnProps {
  id: string;
  flyoutHeaderHeight: number;
  flyoutHeight: number;
}

interface StateReduxProps {
  activePage?: number;
  columns: ColumnHeader[];
  dataProviders?: DataProvider[];
  end: number;
  isLive: boolean;
  itemsPerPage?: number;
  itemsPerPageOptions?: number[];
  kqlMode: KqlMode;
  kqlQueryExpression: string;
  pageCount?: number;
  sort?: Sort;
  start: number;
  show?: boolean;
}

interface DispatchProps {
  createTimeline?: ActionCreator<{
    id: string;
    columns: ColumnHeader[];
    show?: boolean;
  }>;
  addProvider?: ActionCreator<{
    id: string;
    provider: DataProvider;
  }>;
  updateProviders?: ActionCreator<{
    id: string;
    providers: DataProvider[];
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

class StatefulTimelineComponent extends React.Component<Props> {
  public shouldComponentUpdate = ({
    columns,
    dataProviders,
    end,
    flyoutHeight,
    flyoutHeaderHeight,
    id,
    isLive,
    itemsPerPage,
    itemsPerPageOptions,
    kqlMode,
    kqlQueryExpression,
    show,
    start,
    sort,
  }: Props) =>
    !isEqual(columns, this.props.columns) ||
    !isEqual(dataProviders, this.props.dataProviders) ||
    end !== this.props.end ||
    flyoutHeight !== this.props.flyoutHeight ||
    flyoutHeaderHeight !== this.props.flyoutHeaderHeight ||
    id !== this.props.id ||
    isLive !== this.props.isLive ||
    itemsPerPage !== this.props.itemsPerPage ||
    !isEqual(itemsPerPageOptions, this.props.itemsPerPageOptions) ||
    kqlMode !== this.props.kqlMode ||
    kqlQueryExpression !== this.props.kqlQueryExpression ||
    show !== this.props.show ||
    start !== this.props.start ||
    sort !== this.props.sort;

  public componentDidMount() {
    const { createTimeline, id } = this.props;

    if (createTimeline != null) {
      createTimeline({ id, columns: defaultHeaders, show: false });
    }
  }

  public render() {
    const {
      columns,
      dataProviders,
      end,
      flyoutHeight,
      flyoutHeaderHeight,
      id,
      isLive,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      kqlQueryExpression,
      show,
      start,
      sort,
    } = this.props;

    return (
      <WithSource sourceId="default" indexTypes={indexTypes}>
        {({ indexPattern, browserFields }) => (
          <Timeline
            browserFields={browserFields}
            columns={columns}
            id={id}
            dataProviders={dataProviders!}
            end={end}
            flyoutHeaderHeight={flyoutHeaderHeight}
            flyoutHeight={flyoutHeight}
            indexPattern={indexPattern}
            isLive={isLive}
            itemsPerPage={itemsPerPage!}
            itemsPerPageOptions={itemsPerPageOptions!}
            kqlMode={kqlMode}
            kqlQueryExpression={kqlQueryExpression}
            onChangeDataProviderKqlQuery={this.onChangeDataProviderKqlQuery}
            onChangeDroppableAndProvider={this.onChangeDroppableAndProvider}
            onChangeItemsPerPage={this.onChangeItemsPerPage}
            onDataProviderRemoved={this.onDataProviderRemoved}
            onToggleDataProviderEnabled={this.onToggleDataProviderEnabled}
            onToggleDataProviderExcluded={this.onToggleDataProviderExcluded}
            show={show!}
            start={start}
            sort={sort!}
          />
        )}
      </WithSource>
    );
  }

  private onDataProviderRemoved: OnDataProviderRemoved = (
    providerId: string,
    andProviderId?: string
  ) => this.props.removeProvider!({ id: this.props.id, providerId, andProviderId });

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
}

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterQuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, id);
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const {
      columns,
      dataProviders,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      sort,
      show,
    } = timeline;
    const kqlQueryExpression = getKqlQueryTimeline(state, id);

    return {
      columns,
      dataProviders,
      end: input.timerange.to,
      id,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      kqlQueryExpression,
      sort,
      start: input.timerange.from,
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
