/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, RefObject } from 'react';
import { first } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import type { Filter } from '@kbn/es-query';
import type { Query, TimeRange } from '@kbn/es-query';
import type { LayerDescriptor, MapCenterAndZoom } from '../../common/descriptor_types';
import type { MapEmbeddableType } from './types';
import { MapEmbeddable } from './map_embeddable';
import { createBasemapLayerDescriptor } from '../classes/layers/create_basemap_layer_descriptor';

interface Props {
  title: string;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  getLayerDescriptors: () => LayerDescriptor[];
  mapCenter?: MapCenterAndZoom;
  onInitialRenderComplete?: () => void;
  /*
   * Set to false to exclude sharing attributes 'data-*'.
   */
  isSharable?: boolean;
}

export class MapComponent extends Component<Props> {
  private _mapEmbeddable: MapEmbeddableType;
  private readonly _embeddableRef: RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();

  constructor(props: Props) {
    super(props);
    this._mapEmbeddable = new MapEmbeddable(
      {
        editable: false,
      },
      {
        id: uuidv4(),
        attributes: {
          title: this.props.title,
          layerListJSON: JSON.stringify([
            createBasemapLayerDescriptor(),
            ...this.props.getLayerDescriptors(),
          ]),
        },
        mapCenter: this.props.mapCenter,
      }
    );

    if (this.props.onInitialRenderComplete) {
      this._mapEmbeddable
        .getOnRenderComplete$()
        .pipe(first())
        .subscribe(() => {
          if (this.props.onInitialRenderComplete) {
            this.props.onInitialRenderComplete();
          }
        });
    }

    if (this.props.isSharable !== undefined) {
      this._mapEmbeddable.setIsSharable(this.props.isSharable);
    }
  }

  componentDidMount() {
    if (this._embeddableRef.current) {
      this._mapEmbeddable.render(this._embeddableRef.current);
    }
  }

  componentWillUnmount() {
    this._mapEmbeddable.destroy();
  }

  componentDidUpdate() {
    this._mapEmbeddable.updateInput({
      filters: this.props.filters,
      query: this.props.query,
      timeRange: this.props.timeRange,
    });
  }

  render() {
    return <div className="mapEmbeddableContainer" ref={this._embeddableRef} />;
  }
}
