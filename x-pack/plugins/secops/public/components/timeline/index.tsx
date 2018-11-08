/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { mockECSData } from '../../pages/mock/mock_ecs';
import { timelineActions } from '../../store';
import { timelineDefaults } from '../../store/local/timeline/model';
import { State } from '../../store/reducer';
import { timelineByIdSelector } from '../../store/selectors';
import { ColumnHeader } from './body/column_headers/column_header';
import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import { ECS } from './ecs';
import { OnColumnSorted, OnDataProviderRemoved, OnFilterChange, OnRangeSelected } from './events';
import { Timeline } from './timeline';

const onRangeSelected: OnRangeSelected = range => {
  alert(`range selected: ${range}`);
};

const onFilterChange: OnFilterChange = filter => {
  alert(`filter changed: ${JSON.stringify(filter)}`);
};
export interface OwnProps {
  id: string;
  headers: ColumnHeader[];
  width: number;
}

interface StateProps {
  dataProviders: DataProvider[];
  data: ECS[];
  sort: Sort;
}

interface DispatchProps {
  createTimeline: ActionCreator<{ id: string }>;
  updateTimelineSort: ActionCreator<{
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
      dataProviders,
      headers,
      id,
      removeProvider,
      sort,
      updateTimelineSort,
      width,
    } = this.props;

    const onColumnSorted: OnColumnSorted = sorted => {
      updateTimelineSort({ id, sort: sorted });
    };

    const onDataProviderRemoved: OnDataProviderRemoved = dataProvider => {
      removeProvider({ id, providerId: dataProvider.id });
    };

    return (
      <Timeline
        columnHeaders={headers}
        dataProviders={dataProviders}
        data={mockECSData}
        onColumnSorted={onColumnSorted}
        onDataProviderRemoved={onDataProviderRemoved}
        onFilterChange={onFilterChange}
        onRangeSelected={onRangeSelected}
        sort={sort}
        width={width}
      />
    );
  }
}

const mapStateToProps = (state: State, { id }: OwnProps) => {
  const timeline = timelineByIdSelector(state)[id];
  const { dataProviders, data, sort } = timeline || timelineDefaults;

  return timeline != null
    ? timeline
    : {
        id,
        dataProviders,
        data,
        sort,
      };
};

export const StatefulTimeline = connect(
  mapStateToProps,
  {
    createTimeline: timelineActions.createTimeline,
    updateTimelineSort: timelineActions.updateSort,
    removeProvider: timelineActions.removeProvider,
  }
)(StatefulTimelineComponent);
