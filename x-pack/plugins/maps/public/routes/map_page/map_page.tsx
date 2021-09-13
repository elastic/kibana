/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { AppMountParameters } from 'kibana/public';
import { EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import { MapApp } from './map_app';
import { SavedMap, getInitialLayersFromUrlParam } from './saved_map';
import { MapEmbeddableInput } from '../../embeddable/types';

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
      savedMap: this._getNewSavedMap(),
      saveCounter: 0,
    };
  }

  _getNewSavedMap() {
    return new SavedMap({
      defaultLayers: getInitialLayersFromUrlParam(),
      mapEmbeddableInput: this.props.mapEmbeddableInput,
      embeddableId: this.props.embeddableId,
      originatingApp: this.props.originatingApp,
      stateTransfer: this.props.stateTransfer,
      onSaveCallback: this.updateSaveCounter,
    });
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props?.mapEmbeddableInput?.savedObjectId &&
      this.props.mapEmbeddableInput.savedObjectId !== prevProps?.mapEmbeddableInput?.savedObjectId
    ) {
      this.setState({
        savedMap: this._getNewSavedMap(),
        saveCounter: 0,
      });
    }
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
