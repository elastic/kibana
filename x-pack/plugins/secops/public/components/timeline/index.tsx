/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { WithSource } from '../../containers/source';
import { IndexType } from '../../graphql/types';
import { State, timelineActions, timelineModel, timelineSelectors } from '../../store';

import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnChangeItemsPerPage,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
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
  itemsPerPage?: number;
  itemsPerPageOptions?: number[];
  kqlMode: timelineModel.KqlMode;
  kqlQueryExpression: string;
  pageCount?: number;
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
      id,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      kqlQueryExpression,
      show,
      sort,
    } = this.props;

    return (
      <WithSource sourceId="default" indexTypes={[IndexType.ANY]}>
        {({ indexPattern, browserFields }) => (
          <Timeline
            browserFields={browserFields}
            id={id}
            dataProviders={dataProviders!}
            flyoutHeaderHeight={flyoutHeaderHeight}
            flyoutHeight={flyoutHeight}
            indexPattern={indexPattern}
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
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const timeline: timelineModel.TimelineModel = getTimeline(state, id);
    const { dataProviders, itemsPerPage, itemsPerPageOptions, kqlMode, sort, show } = timeline;
    const kqlQueryExpression = getKqlQueryTimeline(state, id);

    return {
      dataProviders,
      id,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
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
