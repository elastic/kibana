/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import {
  EuiColorPicker,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { mapboxgl, Map as MapboxMap } from '@kbn/mapbox-gl';
import { i18n } from '@kbn/i18n';
import { ResizeChecker } from '.././../../../../../../../../src/plugins/kibana_utils/public';
import {
  CUSTOM_ICON_PIXEL_RATIO,
  createSdfIcon,
  // @ts-expect-error
} from '../../symbol_utils';

export interface Props {
  svg: string;
  cutoff: number;
  radius: number;
  isSvgInvalid: boolean;
}

interface State {
  map: MapboxMap | null;
  iconColor: string;
}

export class IconPreview extends Component<Props, State> {
  static iconId = `iconPreview`;
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
    if (
      this.props.svg !== prevProps.svg ||
      this.props.cutoff !== prevProps.cutoff ||
      this.props.radius !== prevProps.radius
    ) {
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
  };

  _setContainerRef = (element: HTMLDivElement) => {
    this._containerRef = element;
  };

  async _syncImageToMap() {
    if (this._isMounted && this.state.map) {
      const map = this.state.map;
      const { svg, cutoff, radius, isSvgInvalid } = this.props;
      if (!svg || isSvgInvalid) {
        map.setLayoutProperty('icon-layer', 'visibility', 'none');
        return;
      }
      const imageData = await createSdfIcon({ svg, cutoff, radius });
      if (map.hasImage(IconPreview.iconId)) {
        // @ts-expect-error
        map.updateImage(IconPreview.iconId, imageData);
      } else {
        map.addImage(IconPreview.iconId, imageData, {
          sdf: true,
          pixelRatio: CUSTOM_ICON_PIXEL_RATIO,
        });
      }
      map.setLayoutProperty('icon-layer', 'icon-image', IconPreview.iconId);
      map.setLayoutProperty('icon-layer', 'icon-size', 6);
      map.setLayoutProperty('icon-layer', 'visibility', 'visible');
      this._syncPaintPropertiesToMap();
    }
  }

  _syncPaintPropertiesToMap() {
    const { map, iconColor } = this.state;
    if (!map) return;
    map.setPaintProperty('icon-layer', 'icon-halo-color', '#000000');
    map.setPaintProperty('icon-layer', 'icon-halo-width', 1);
    map.setPaintProperty('icon-layer', 'icon-color', iconColor);
    map.setLayoutProperty('icon-layer', 'icon-size', 12);
  }

  _initResizerChecker() {
    this._checker = new ResizeChecker(this._containerRef!);
    this._checker.on('resize', () => {
      if (this.state.map) {
        this.state.map.resize();
      }
    });
  }

  _createMapInstance(): MapboxMap {
    const map = new mapboxgl.Map({
      container: this._containerRef!,
      preserveDrawingBuffer: true,
      interactive: false,
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
      this._syncImageToMap();
    });

    return map;
  }

  _initializeMap() {
    const map: MapboxMap = this._createMapInstance();

    this.setState({ map }, () => {
      this._initResizerChecker();
    });
  }

  render() {
    const iconColor = this.state.iconColor;
    return (
      <div>
        <EuiFlexItem>
          <EuiPanel color="subdued" hasBorder={true} hasShadow={false} grow={true}>
            <EuiTitle size="xxxs">
              <h4>
                <EuiToolTip
                  content={i18n.translate('xpack.maps.customIconModal.elementPreviewTooltip', {
                    defaultMessage:
                      'Dynamic styling requires rendering SVG icons using a signed distance function. As a result, sharp corners and intricate details may not render correctly. You may be able to tweak the Alpha threshold and Radius for better results.',
                  })}
                >
                  <>
                    {i18n.translate('xpack.maps.customIconModal.elementPreviewTitle', {
                      defaultMessage: 'Render preview',
                    })}{' '}
                    <EuiIcon color="subdued" type="questionInCircle" />
                  </>
                </EuiToolTip>
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel hasBorder={true} hasShadow={false}>
              <div
                id="mapsCustomIconPreview__mapContainer"
                ref={this._setContainerRef}
                data-test-subj="mapsCustomIconPreview"
                className="mapsCustomIconPreview__mapContainer"
              />
            </EuiPanel>
            <EuiSpacer size="m" />
            <EuiFormRow label="Preview color">
              <EuiColorPicker onChange={this._setIconColor} color={iconColor} />
            </EuiFormRow>
          </EuiPanel>
        </EuiFlexItem>
      </div>
    );
  }
}
