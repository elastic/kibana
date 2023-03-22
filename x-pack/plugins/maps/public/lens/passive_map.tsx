/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, RefObject } from 'react';
import { debounce } from 'lodash';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, skip, startWith } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { EuiLoadingChart } from '@elastic/eui';
import { EmbeddableFactory, ViewMode } from '@kbn/embeddable-plugin/public';
import type { LayerDescriptor } from '../../common/descriptor_types';
import { INITIAL_LOCATION } from '../../common';
import { RENDER_TIMEOUT } from '../../common/constants';
import { MapEmbeddable, MapEmbeddableInput, MapEmbeddableOutput } from '../embeddable';
import { createBasemapLayerDescriptor } from '../classes/layers/create_basemap_layer_descriptor';

interface Props {
  factory: EmbeddableFactory<MapEmbeddableInput, MapEmbeddableOutput>;
  passiveLayer: LayerDescriptor;
  onRenderComplete: () => void;
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
  private _outputSubscription: Subscription | undefined;

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
    if (this._outputSubscription) {
      this._outputSubscription.unsubscribe();
    }
  }

  componentDidUpdate() {
    if (this.state.mapEmbeddable && this._prevPassiveLayer !== this.props.passiveLayer) {
      this.state.mapEmbeddable.updateLayerById(this.props.passiveLayer);
      this._prevPassiveLayer = this.props.passiveLayer;
    }
  }

  _onRenderComplete = debounce(() => {
    if (!this._isMounted) {
      return;
    }

    this.props.onRenderComplete();
  }, RENDER_TIMEOUT);

  async _setupEmbeddable() {
    const basemapLayerDescriptor = createBasemapLayerDescriptor();
    const intialLayers = basemapLayerDescriptor ? [basemapLayerDescriptor] : [];
    const mapEmbeddable = (await this.props.factory.create({
      id: uuidv4(),
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
    })) as MapEmbeddable | undefined;

    if (!mapEmbeddable) {
      return;
    }

    this._outputSubscription = mapEmbeddable
      .getOutput$()
      .pipe(
        // wrapping distinctUntilChanged with startWith and skip to prime distinctUntilChanged with an initial value.
        startWith(mapEmbeddable.getOutput()),
        distinctUntilChanged((a, b) => a.loading === b.loading),
        skip(1)
      )
      .subscribe((output) => {
        if (output.loading) {
          this._onRenderComplete.cancel();
        } else {
          this._onRenderComplete();
        }
      });

    if (this._isMounted) {
      mapEmbeddable.setIsSharable(false);
      this.setState({ mapEmbeddable }, () => {
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
