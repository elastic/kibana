/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingChart } from '@elastic/eui';
import type { Embeddable } from '../../../../../../src/plugins/embeddable/public';
import type { MapEmbeddableInput, MapEmbeddableOutput } from '../../embeddable';
import { lazyLoadMapModules, LazyLoadedMapModules } from '../../lazy_load_bundle';
import uuid from 'uuid/v4';

interface Props {
  layerDescriptorParams: unknown;
}

interface State {
  mapModules?: LazyLoadedMapModules;
}

export class TileMapVisualization extends Component<Props, State> {
  private _isMounted = false;
  private _mapEmbeddable?: Embeddable<MapEmbeddableInput, MapEmbeddableOutput> | undefined;
  private readonly _embeddableRef: HTMLDivElement = React.createRef();
  
  state: State = {};

  componentDidMount() {
    this._isMounted = true;
    this._load();
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._mapEmbeddable) {
      this._mapEmbeddable.destroy();
    }
  }

  async _load() {
    const mapModules = await lazyLoadMapModules();
    if (!this._isMounted) {
      return;
    }

    this.setState({ mapModules });

    const tileMapLayerDescriptor = mapModules.createTileMapLayerDescriptor(this.props.layerDescriptorParams);
    this._mapEmbeddable = new mapModules.MapEmbeddable(
      {
        editable: false,
      },
      {
        id: uuid(),
        attributes: {
          title: '',
          layerListJSON: JSON.stringify([
            mapModules.createBasemapLayerDescriptor(),
            mapModules.createTileMapLayerDescriptor(this.props.layerDescriptorParams),
          ]),
        },
      }
    );
    this._mapEmbeddable.render(this._embeddableRef.current);
  }

  render() {
    if (!this.state.mapModules) {
      return <EuiLoadingChart mono size="l" />;
    }

    return <div className="mapLegacyVisualizationContainer" ref={this._embeddableRef} />;
  }
}
