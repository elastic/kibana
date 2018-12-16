/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo, getOr } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { timelineActions } from '../../../store';
import { KqlMode } from '../../../store/local/timeline/model';
import { State } from '../../../store/reducer';
import { timelineByIdSelector } from '../../../store/selectors';
import { SearchOrFilter } from './search_or_filter';

interface OwnProps {
  timelineId: string;
}

interface StateReduxProps {
  kqlMode?: KqlMode;
  kqlQuery?: string;
}

interface DispatchProps {
  updateKqlMode?: ActionCreator<{
    id: string;
    kqlMode: KqlMode;
  }>;
  updateKqlQuery?: ActionCreator<{
    id: string;
    kqlQuery: string;
  }>;
}

type Props = OwnProps & StateReduxProps & DispatchProps;

class StatefulSearchOrFilterComponent extends React.PureComponent<Props> {
  public render() {
    const { kqlMode, kqlQuery, timelineId, updateKqlMode, updateKqlQuery } = this.props;

    return (
      <SearchOrFilter
        kqlMode={kqlMode!}
        kqlQuery={kqlQuery!}
        timelineId={timelineId}
        updateKqlMode={updateKqlMode!}
        updateKqlQuery={updateKqlQuery!}
      />
    );
  }
}

const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
  const timelineById = defaultTo({}, timelineByIdSelector(state));

  const kqlMode: KqlMode = getOr('filter', `${timelineId}.kqlMode`, timelineById);
  const kqlQuery = getOr('', `${timelineId}.kqlQuery`, timelineById);

  return { kqlMode, kqlQuery };
};

export const StatefulSearchOrFilter = connect(
  mapStateToProps,
  {
    updateKqlMode: timelineActions.updateKqlMode,
    updateKqlQuery: timelineActions.updateKqlQuery,
  }
)(StatefulSearchOrFilterComponent);
