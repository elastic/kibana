/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiColorPicker, EuiFlexItem, EuiFormRow, EuiPanel, EuiSpacer } from '@elastic/eui';
import { ResizeChecker } from '.././../../../../../../../../src/plugins/kibana_utils/public';
import { mapboxgl, Map as MapboxMap } from '@kbn/mapbox-gl';
// @ts-expect-error
import { CUSTOM_ICON_PREFIX_SDF, createSdfIcon, getCustomIconId } from '../../symbol_utils';


export interface Props {
  svg?: string;
}

interface State {
  map: MapboxMap | null;
  iconColor: string | null;
}

export class IconPreview extends Component<Props, State> {
  static iconId = `${CUSTOM_ICON_PREFIX_SDF}__iconPreview`;
  private _checker?: ResizeChecker;
  private _isMounted = false;
  private _containerRef: HTMLDivElement | null = null;

  state: State = {
    map: null,
    iconColor: '#E7664C',
  };

  componentDidMount() {
    this._isMounted = true;
    this._initializeMap();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.svg !== prevProps.svg) {
      this._syncImageToMap();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._checker) {
      this._checker.destroy();
    }
    if (this.state.map) {
      this.state.map.remove();
      this.state.map = null;
    }
  }

  _setIconColor = (iconColor: string) => {
    this.setState({ iconColor }, () => {
      this._syncPaintPropertiesToMap();
    });
  }

  _setContainerRef = (element: HTMLDivElement) => {
    this._containerRef = element;
  };

  async _syncImageToMap() {
    if (this._isMounted && this.state.map && this.props.svg) {
      const map = this.state.map;
      const sdfImage = await createSdfIcon(this.props.svg);
      if (map.hasImage(IconPreview.iconId)) {
        // @ts-expect-error
        map.updateImage(IconPreview.iconId, sdfImage);
      } else {
        map.addImage(IconPreview.iconId, sdfImage, { sdf: true });
      }
      map.setLayoutProperty('icon-layer', 'icon-image', IconPreview.iconId);
      this._syncPaintPropertiesToMap();
    }
  }

  _syncPaintPropertiesToMap() {
    const { map, iconColor } = this.state;
    if (!map) return;
    map.setPaintProperty('icon-layer', 'icon-halo-color', '#000000');
    map.setPaintProperty('icon-layer', 'icon-halo-width', 1);
    map.setPaintProperty('icon-layer', 'icon-color', iconColor);
  }

  _initResizerChecker() {
    this._checker = new ResizeChecker(this._containerRef!);
    this._checker.on('resize', () => {
      if (this.state.map) {
        this.state.map.resize();
      }
    });
  }

  async _initializeMap() {
    if (!this._isMounted) return;

    const map = new mapboxgl.Map({
      container: this._containerRef!,
      center: [0, 0],
      zoom: 2,
      style: {
        version: 8,
        name: 'Empty',
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': 'rgba(0,0,0,0)',
            },
          },
        ],
      },
    });
    map.on('load', () => {
      map.addLayer({
        id: 'icon-layer',
        type: 'symbol',
        source: {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [0, 0],
            },
            properties: {},
          },
        },
      });
    });

    this.setState({ map }, () => {
      this._initResizerChecker();
    });
  }

  render() {
    const iconColor = this.state.iconColor;
    return (
      <div>
        <EuiFlexItem>
          <EuiPanel>
            <div
              id="mapsCustomIconPreview__mapContainer"
              ref={this._setContainerRef}
              data-test-subj="mapsCustomIconPreview"
              className="mapsCustomIconPreview__mapContainer"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexItem>
          <EuiFormRow label="Icon color">
            <EuiColorPicker onChange={this._setIconColor} color={iconColor} />
          </EuiFormRow>
        </EuiFlexItem>
      </div>
    );
  }
}
