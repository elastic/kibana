/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import type { AppMountParameters } from '../../../../../../src/core/public/application/types';
import { EmbeddableStateTransfer } from '../../../../../../src/plugins/embeddable/public/lib/state_transfer/embeddable_state_transfer';
import type { MapEmbeddableInput } from '../../embeddable/types';
import { MapApp } from './map_app';
import { getInitialLayersFromUrlParam } from './saved_map/get_initial_layers_from_url_param';
import { SavedMap } from './saved_map/saved_map';

interface Props {
  mapEmbeddableInput?: MapEmbeddableInput;
  embeddableId?: string;
  onAppLeave: AppMountParameters['onAppLeave'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  stateTransfer: EmbeddableStateTransfer;
  originatingApp?: string;
}

interface State {
  savedMap: SavedMap;
  saveCounter: number;
}

// react-router-dom.route "render" method may be called multiple times for the same route.
// Therefore state can not exist in the "render" closure
// MapAppContainer exists to wrap MapApp in a component so that a single instance of SavedMap
// exists per route regardless of how many times render method is called.
export class MapPage extends Component<Props, State> {
  private _isMounted: boolean = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      savedMap: new SavedMap({
        defaultLayers: getInitialLayersFromUrlParam(),
        mapEmbeddableInput: props.mapEmbeddableInput,
        embeddableId: props.embeddableId,
        originatingApp: props.originatingApp,
        stateTransfer: props.stateTransfer,
        onSaveCallback: this.updateSaveCounter,
      }),
      saveCounter: 0,
    };
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  updateSaveCounter = () => {
    if (this._isMounted) {
      this.setState((prevState) => {
        return { saveCounter: prevState.saveCounter + 1 };
      });
    }
  };

  render() {
    return (
      <Provider store={this.state.savedMap.getStore()}>
        <MapApp
          savedMap={this.state.savedMap}
          onAppLeave={this.props.onAppLeave}
          setHeaderActionMenu={this.props.setHeaderActionMenu}
          saveCounter={this.state.saveCounter}
        />
      </Provider>
    );
  }
}
