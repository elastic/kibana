/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, RefObject } from 'react';
import uuid from 'uuid/v4';
import { EuiLoadingChart } from '@elastic/eui';
import type { Filter, Query, TimeRange } from '../../../../../../src/plugins/data/common';
import type { Embeddable } from '../../../../../../src/plugins/embeddable/public';
import type { MapEmbeddableInput, MapEmbeddableOutput } from '../../embeddable';
import { lazyLoadMapModules } from '../../lazy_load_bundle';
import { RegionMapVisConfig } from './types';

interface Props {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  visConfig: RegionMapVisConfig;
}

interface State {
  isLoaded: boolean;
}

export class RegionMapVisualization extends Component<Props, State> {
  private _isMounted = false;
  private _mapEmbeddable?: Embeddable<MapEmbeddableInput, MapEmbeddableOutput> | undefined;
  private readonly _embeddableRef: RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();

  state: State = { isLoaded: false };

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

  componentDidUpdate() {
    if (this._mapEmbeddable) {
      this._mapEmbeddable.updateInput({
        filters: this.props.filters,
        query: this.props.query,
        timeRange: this.props.timeRange,
      });
    }
  }

  async _load() {
    const mapModules = await lazyLoadMapModules();
    if (!this._isMounted) {
      return;
    }

    this.setState({ isLoaded: true });

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
            mapModules.createRegionMapLayerDescriptor(this.props.visConfig.layerDescriptorParams),
          ]),
        },
        mapCenter: {
          lat: this.props.visConfig.mapCenter[0],
          lon: this.props.visConfig.mapCenter[1],
          zoom: this.props.visConfig.mapZoom,
        },
      }
    );
    if (this._embeddableRef.current) {
      this._mapEmbeddable.render(this._embeddableRef.current);
    }
  }

  render() {
    if (!this.state.isLoaded) {
      return <EuiLoadingChart mono size="l" />;
    }

    return <div className="mapLegacyVisualizationContainer" ref={this._embeddableRef} />;
  }
}
