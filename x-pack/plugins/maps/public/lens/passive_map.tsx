/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, RefObject } from 'react';
import uuid from 'uuid/v4';
import { EuiLoadingChart } from '@elastic/eui';
import { EmbeddableFactory, ViewMode } from '@kbn/embeddable-plugin/public';
import type { LayerDescriptor } from '../../common/descriptor_types';
import { INITIAL_LOCATION } from '../../common';
import { MapEmbeddable, MapEmbeddableInput, MapEmbeddableOutput } from '../embeddable';
import { createBasemapLayerDescriptor } from '../classes/layers/create_basemap_layer_descriptor';

interface Props {
  factory: EmbeddableFactory<MapEmbeddableInput, MapEmbeddableOutput>;
  passiveLayer: LayerDescriptor;
}

interface State {
  mapEmbeddable: MapEmbeddable | null;
}

/*
 * PassiveMap compoment is a wrapper around a map embeddable where passive layer descriptor provides features
 * and layer does not auto-fetch features based on changes to pan, zoom, filter, query, timeRange, and other state changes.
 * To update features, update passiveLayer prop with new layer descriptor.
 * Contrast with traditional map (active map), where layers independently auto-fetch features
 * based on changes to pan, zoom, filter, query, timeRange, and other state changes
 */
export class PassiveMap extends Component<Props, State> {
  private _isMounted = false;
  private _prevPassiveLayer = this.props.passiveLayer;
  private readonly _embeddableRef: RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();

  state: State = { mapEmbeddable: null };

  componentDidMount() {
    this._isMounted = true;
    this._setupEmbeddable();
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this.state.mapEmbeddable) {
      this.state.mapEmbeddable.destroy();
    }
  }

  componentDidUpdate() {
    if (this.state.mapEmbeddable && this._prevPassiveLayer !== this.props.passiveLayer) {
      this.state.mapEmbeddable.updateLayerById(this.props.passiveLayer);
      this._prevPassiveLayer = this.props.passiveLayer;
    }
  }

  async _setupEmbeddable() {
    const basemapLayerDescriptor = createBasemapLayerDescriptor();
    const intialLayers = basemapLayerDescriptor ? [basemapLayerDescriptor] : [];
    const mapEmbeddable = await this.props.factory.create({
      id: uuid(),
      attributes: {
        title: '',
        layerListJSON: JSON.stringify([...intialLayers, this.props.passiveLayer]),
      },
      filters: [],
      hidePanelTitles: true,
      viewMode: ViewMode.VIEW,
      isLayerTOCOpen: false,
      hideFilterActions: true,
      mapSettings: {
        disableInteractive: false,
        hideToolbarOverlay: false,
        hideLayerControl: false,
        hideViewControl: false,
        initialLocation: INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS, // this will startup based on data-extent
        autoFitToDataBounds: true, // this will auto-fit when there are changes to the filter and/or query
      },
    });

    if (!mapEmbeddable) {
      return;
    }

    if (this._isMounted) {
      this.setState({ mapEmbeddable: mapEmbeddable as MapEmbeddable }, () => {
        if (this.state.mapEmbeddable && this._embeddableRef.current) {
          this.state.mapEmbeddable.render(this._embeddableRef.current);
        }
      });
    }
  }

  render() {
    if (!this.state.mapEmbeddable) {
      return <EuiLoadingChart mono size="l" />;
    }

    return <div className="mapEmbeddableContainer" ref={this._embeddableRef} />;
  }
}
