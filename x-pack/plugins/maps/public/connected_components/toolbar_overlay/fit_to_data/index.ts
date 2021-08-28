/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { fitToDataBounds } from '../../../actions/data_request_actions';
import type { MapStoreState } from '../../../reducers/store';
import { FitToData } from './fit_to_data';

function mapStateToProps(state: MapStoreState) {
  return {};
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    fitToBounds: () => {
      dispatch(fitToDataBounds());
    },
  };
}

const connectedFitToData = connect(mapStateToProps, mapDispatchToProps)(FitToData);
export { connectedFitToData as FitToData };
