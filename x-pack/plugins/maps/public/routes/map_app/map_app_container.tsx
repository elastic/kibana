/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { AppMountParameters } from 'kibana/public';
import { EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import { MapApp } from './map_app_connector';
import { SavedMap } from './saved_map';
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
}

// react-router-dom.route "render" method may be called multiple times for the same route.
// Therefore state can not exist in the "render" closure
// MapAppContainer exists to wrap MapApp in a component so that a single instance of SavedMap
// exists per route regardless of how many times render method is called.
export class MapAppContainer extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      savedMap: new SavedMap({
        mapEmbeddableInput: props.mapEmbeddableInput,
        embeddableId: this.props.embeddableId,
        originatingApp: this.props.originatingApp,
        stateTransfer: this.props.stateTransfer,
      }),
    };
  }

  render() {
    return (
      <Provider store={this.state.savedMap.getStore()}>
        <MapApp
          savedMap={this.state.savedMap}
          onAppLeave={this.props.onAppLeave}
          setHeaderActionMenu={this.props.setHeaderActionMenu}
        />
      </Provider>
    );
  }
}
