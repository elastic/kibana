/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { timelineActions } from '../../store';
import { timelineDefaults } from '../../store/local/timeline/model';
import { State } from '../../store/reducer';
import { timelineByIdSelector } from '../../store/selectors';
import { ColumnHeader } from './body/column_headers/column_header';
import { Range } from './body/column_headers/range_picker/ranges';
import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import { ECS } from './ecs';
import { OnColumnSorted, OnDataProviderRemoved, OnRangeSelected } from './events';
import { Timeline } from './timeline';

export interface OwnProps {
  id: string;
  headers: ColumnHeader[];
  width: number;
}

interface StateProps {
  dataProviders: DataProvider[];
  data: ECS[];
  range: Range;
  sort: Sort;
}

interface DispatchProps {
  createTimeline: ActionCreator<{ id: string }>;
  updateData: ActionCreator<{
    id: string;
    data: ECS[];
  }>;
  updateRange: ActionCreator<{
    id: string;
    range: Range;
  }>;
  updateSort: ActionCreator<{
    id: string;
    sort: Sort;
  }>;
  removeProvider: ActionCreator<{
    id: string;
    providerId: string;
  }>;
}

type Props = OwnProps & StateProps & DispatchProps;

class StatefulTimelineComponent extends React.PureComponent<Props> {
  public componentDidMount() {
    const { createTimeline, id } = this.props;

    createTimeline({ id });
  }

  public render() {
    const {
      data,
      dataProviders,
      headers,
      id,
      range,
      removeProvider,
      sort,
      updateRange,
      updateSort,
      width,
    } = this.props;

    const onColumnSorted: OnColumnSorted = sorted => {
      updateSort({ id, sort: sorted });
    };

    const onDataProviderRemoved: OnDataProviderRemoved = dataProvider => {
      removeProvider({ id, providerId: dataProvider.id });
    };

    const onRangeSelected: OnRangeSelected = selectedRange => {
      updateRange({ id, range: selectedRange });
    };

    return (
      <Timeline
        columnHeaders={headers}
        dataProviders={dataProviders}
        data={data}
        onColumnSorted={onColumnSorted}
        onDataProviderRemoved={onDataProviderRemoved}
        onFilterChange={noop}
        onRangeSelected={onRangeSelected}
        range={range}
        sort={sort}
        width={width}
      />
    );
  }
}

const mapStateToProps = (state: State, { id }: OwnProps) => {
  const timeline = timelineByIdSelector(state)[id];
  const { dataProviders, data, range, sort } = timeline || timelineDefaults;

  return timeline != null
    ? timeline
    : {
        id,
        dataProviders,
        data,
        range,
        sort,
      };
};

export const StatefulTimeline = connect(
  mapStateToProps,
  {
    createTimeline: timelineActions.createTimeline,
    updateData: timelineActions.updateData,
    updateRange: timelineActions.updateRange,
    updateSort: timelineActions.updateSort,
    removeProvider: timelineActions.removeProvider,
  }
)(StatefulTimelineComponent);
