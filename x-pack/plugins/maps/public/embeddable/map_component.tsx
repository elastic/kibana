/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, RefObject } from 'react';
import { first } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { LayerDescriptor, MapCenterAndZoom, MapSettings } from '../../common/descriptor_types';
import { MapEmbeddable } from './map_embeddable';
import { createBasemapLayerDescriptor } from '../classes/layers/create_basemap_layer_descriptor';
import { RenderToolTipContent } from '../classes/tooltips/tooltip_property';
import { MapApi } from './map_api';

export interface Props {
  title?: string;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  layerList: LayerDescriptor[];
  mapSettings?: Partial<MapSettings>;
  hideFilterActions?: boolean;
  isLayerTOCOpen?: boolean;
  mapCenter?: MapCenterAndZoom;
  onInitialRenderComplete?: () => void;
  getTooltipRenderer?: () => RenderToolTipContent;
  onApiAvailable?: (api: MapApi) => void;
  /*
   * Set to false to exclude sharing attributes 'data-*'.
   */
  isSharable?: boolean;
}

export class MapComponent extends Component<Props> {
  private _prevLayerList: LayerDescriptor[];
  private _mapEmbeddable: MapEmbeddable;
  private readonly _embeddableRef: RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();

  constructor(props: Props) {
    super(props);
    this._prevLayerList = this.props.layerList;
    this._mapEmbeddable = new MapEmbeddable(
      {
        editable: false,
      },
      {
        id: uuidv4(),
        attributes: {
          title: this.props.title ?? '',
          layerListJSON: JSON.stringify(this.getLayerList()),
        },
        hidePanelTitles: !Boolean(this.props.title),
        viewMode: ViewMode.VIEW,
        isLayerTOCOpen:
          typeof this.props.isLayerTOCOpen === 'boolean' ? this.props.isLayerTOCOpen : false,
        hideFilterActions:
          typeof this.props.hideFilterActions === 'boolean' ? this.props.hideFilterActions : false,
        mapCenter: this.props.mapCenter,
        mapSettings: this.props.mapSettings ?? {},
      }
    );
    this._mapEmbeddable.updateInput({
      filters: this.props.filters,
      query: this.props.query,
      timeRange: this.props.timeRange,
    });

    if (this.props.getTooltipRenderer) {
      this._mapEmbeddable.setRenderTooltipContent(this.props.getTooltipRenderer());
    }
    if (this.props.onApiAvailable) {
      this.props.onApiAvailable(this._mapEmbeddable as MapApi);
    }

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

    if (this._prevLayerList !== this.props.layerList) {
      this._mapEmbeddable.setLayerList(this.getLayerList());
      this._prevLayerList = this.props.layerList;
    }
  }

  getLayerList(): LayerDescriptor[] {
    const basemapLayer = createBasemapLayerDescriptor();
    return basemapLayer ? [basemapLayer, ...this.props.layerList] : this.props.layerList;
  }

  render() {
    return <div className="mapEmbeddableContainer" ref={this._embeddableRef} />;
  }
}
