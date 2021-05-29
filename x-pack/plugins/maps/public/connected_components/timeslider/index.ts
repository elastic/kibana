/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { Timeslider } from './timeslider';
import { closeTimeslider, setQuery } from '../../actions';
import { getTimeFilters } from '../../selectors/map_selectors';
import { getIsTimesliderOpen } from '../../selectors/ui_selectors';
import { MapStoreState } from '../../reducers/store';
import { Timeslice } from '../../../common/descriptor_types';

function mapStateToProps(state: MapStoreState) {
  return {
    isTimesliderOpen: getIsTimesliderOpen(state),
    timeRange: getTimeFilters(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    closeTimeslider: () => {
      dispatch(closeTimeslider());
    },
    setTimeslice: (timeslice: Timeslice) => {
      dispatch(
        setQuery({
          forceRefresh: false,
          timeslice,
        })
      );
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(Timeslider);
export { connected as Timeslider };
