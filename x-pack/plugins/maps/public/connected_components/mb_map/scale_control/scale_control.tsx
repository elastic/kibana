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

function getScaleDistance(value: number) {
  const orderOfMagnitude = Math.floor(Math.log10(value));
  const pow10 = Math.pow(10, orderOfMagnitude);

  // reduce value to single order of magnitude to making rounding simple regardless of order of magnitude
  const distance = value / pow10;

  if (distance < 1) {
    return pow10 * (Math.round(distance * 10) / 10);
  }

  // provide easy to multiple round numbers for scale distance so its easy to measure distances longer then the scale
  if (distance >= 10) {
    return 10 * pow10;
  }

  if (distance >= 5) {
    return 5 * pow10;
  }

  if (distance >= 3) {
    return 3 * pow10;
  }

  return Math.floor(distance) * pow10;
}

export class ScaleControl extends React.Component {
  private _isMounted: boolean = false;

  state: State = { label: '', width: 0 };

  componentDidMount() {
    this._isMounted = true;
    this.props.mbMap.on('move', this._onUpdate);
    this._onUpdate();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.mbMap.off('move', this._onUpdate);
  }

  _onUpdate = () => {
    if (!this._isMounted) {
      return;
    }
    const centerHeight = this.props.mbMap.getContainer().clientHeight / 2;
    const leftLatLon = this.props.mbMap.unproject([0, centerHeight]);
    const rightLatLon = this.props.mbMap.unproject([MAX_WIDTH, centerHeight]);
    const maxDistanceMeters = leftLatLon.distanceTo(rightLatLon);
    if (maxDistanceMeters >= 1000) {
      this._setScale(
        maxDistanceMeters / 1000,
        i18n.translate('xpack.maps.kilometersAbbr', {
          defaultMessage: 'km',
        })
      );
    } else {
      this._setScale(
        maxDistanceMeters,
        i18n.translate('xpack.maps.metersAbbr', {
          defaultMessage: 'm',
        })
      );
    }
  };

  _setScale(maxDistance: number, unit: string) {
    const scaleDistance = getScaleDistance(maxDistance);
    this.setState({
      width: MAX_WIDTH * (scaleDistance / maxDistance),
      label: `${scaleDistance} ${unit}`,
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
