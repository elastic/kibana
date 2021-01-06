/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import { Map as MapboxMap } from 'mapbox-gl';

const MAX_WIDTH = 100;

interface Props {
  mbMap: MapboxMap;
}

interface State {
  label: string;
  width: number;
}

function roundValue(value: number) {
  const orderOfMagnitude = Math.floor(Math.log10(value));
  const pow10 = Math.pow(10, orderOfMagnitude);
  const d = value / pow10;
  return d >= 1 ? Math.floor(d) * pow10 : pow10 * (Math.round(d * 10) / 10);
}

export class ScaleControl extends React.Component {
  private _isMounted: boolean = false;

  state: State = { label: '', width: 0 };

  componentDidMount() {
    this._isMounted = true;
    this.props.mbMap.on('move', this._updateScale);
    this._updateScale();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.mbMap.off('move', this._updateScale);
  }

  _updateScale = () => {
    if (!this._isMounted) {
      return;
    }
    const centerHeight = this.props.mbMap.getContainer().clientHeight / 2;
    const leftLatLon = this.props.mbMap.unproject([0, centerHeight]);
    const rightLatLon = this.props.mbMap.unproject([MAX_WIDTH, centerHeight]);
    const maxMeters = leftLatLon.distanceTo(rightLatLon);
    if (maxMeters >= 1000) {
      this._setScale(
        maxMeters / 1000,
        i18n.translate('xpack.maps.kilometersAbbr', {
          defaultMessage: 'km',
        })
      );
    } else {
      this._setScale(
        maxMeters,
        i18n.translate('xpack.maps.metersAbbr', {
          defaultMessage: 'm',
        })
      );
    }
  };

  _setScale(maxDistance: number, unit: string) {
    const distance = roundValue(maxDistance);
    const ratio = distance / maxDistance;
    this.setState({
      width: MAX_WIDTH * ratio,
      label: `${distance} ${unit}`,
    });
  }

  render() {
    return (
      <div className="mapScaleControl" style={{ width: `${this.state.width}px` }}>
        {this.state.label}
      </div>
    );
  }
}
