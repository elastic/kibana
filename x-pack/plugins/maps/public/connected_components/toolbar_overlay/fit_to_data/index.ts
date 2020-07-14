/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { MapStoreState } from '../../../reducers/store';
import { fitToDataBounds } from '../../../actions';
import { getFittableLayers } from '../../../selectors/map_selectors';
import { FitToData } from './fit_to_data';

function mapStateToProps(state: MapStoreState) {
  return {
    layerList: getFittableLayers(state),
  };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
  return {
    fitToBounds: () => {
      dispatch<any>(fitToDataBounds());
    },
  };
}

const connectedFitToData = connect(mapStateToProps, mapDispatchToProps)(FitToData);
export { connectedFitToData as FitToData };
