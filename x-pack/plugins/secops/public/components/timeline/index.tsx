/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo, noop } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { WithSource } from '../../containers/source';
import { timelineActions } from '../../store';
import { themeSelector } from '../../store/local/app';
import { Theme } from '../../store/local/app/model';
import { timelineDefaults } from '../../store/local/timeline/model';
import { State } from '../../store/reducer';
import { timelineByIdSelector } from '../../store/selectors';
import { ColumnHeader } from './body/column_headers/column_header';
import { columnRenderers, rowRenderers } from './body/renderers';
import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import {
  OnChangeItemsPerPage,
  OnColumnSorted,
  OnDataProviderRemoved,
  OnRangeSelected,
  OnToggleDataProviderEnabled,
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
  pageCount?: number;
  range?: string;
  sort?: Sort;
  show?: boolean;
  theme?: Theme;
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
  }>;
  updateDataProviderEnabled?: ActionCreator<{
    id: string;
    providerId: string;
    enabled: boolean;
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
      range,
      removeProvider,
      show,
      sort,
      theme,
      updateRange,
      updateSort,
      updateDataProviderEnabled,
      updateItemsPerPage,
    } = this.props;

    const onColumnSorted: OnColumnSorted = sorted => updateSort!({ id, sort: sorted });

    const onDataProviderRemoved: OnDataProviderRemoved = dataProvider =>
      removeProvider!({ id, providerId: dataProvider.id });

    const onRangeSelected: OnRangeSelected = selectedRange =>
      updateRange!({ id, range: selectedRange });

    const onToggleDataProviderEnabled: OnToggleDataProviderEnabled = ({ dataProvider, enabled }) =>
      updateDataProviderEnabled!({ id, enabled, providerId: dataProvider.id });

    const onChangeItemsPerPage: OnChangeItemsPerPage = itemsChangedPerPage =>
      updateItemsPerPage!({ id, itemsPerPage: itemsChangedPerPage });

    return (
      <WithSource sourceId="default">
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
            onChangeItemsPerPage={onChangeItemsPerPage}
            onColumnSorted={onColumnSorted}
            onDataProviderRemoved={onDataProviderRemoved}
            onFilterChange={noop} // TODO: this is the callback for column filters, which is out scope for this phase of delivery
            onRangeSelected={onRangeSelected}
            onToggleDataProviderEnabled={onToggleDataProviderEnabled}
            range={range!}
            rowRenderers={rowRenderers}
            show={show!}
            sort={sort!}
            theme={theme!}
            indexPattern={indexPattern}
          />
        )}
      </WithSource>
    );
  }
}

const mapStateToProps = (state: State, { id }: OwnProps) => {
  const timeline = timelineByIdSelector(state)[id];
  const { dataProviders, sort, show, itemsPerPage, itemsPerPageOptions } =
    timeline || timelineDefaults;
  const theme = defaultTo('dark', themeSelector(state));

  return { id, dataProviders, sort, show, theme, itemsPerPage, itemsPerPageOptions };
};

export const StatefulTimeline = connect(
  mapStateToProps,
  {
    addProvider: timelineActions.addProvider,
    createTimeline: timelineActions.createTimeline,
    updateProviders: timelineActions.updateProviders,
    updateRange: timelineActions.updateRange,
    updateSort: timelineActions.updateSort,
    updateDataProviderEnabled: timelineActions.updateDataProviderEnabled,
    updateItemsPerPage: timelineActions.updateItemsPerPage,
    updateItemsPerPageOptions: timelineActions.updateItemsPerPageOptions,
    removeProvider: timelineActions.removeProvider,
  }
)(StatefulTimelineComponent);
