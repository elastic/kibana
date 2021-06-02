/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
// @ts-expect-error
import MapboxDraw from '@mapbox/mapbox-gl-draw';
// @ts-expect-error
import DrawRectangle from 'mapbox-gl-draw-rectangle-mode';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { Feature } from 'geojson';
import { DRAW_TYPE } from '../../../../common/constants';
import { DrawCircle } from './draw_circle';
import { DrawTooltip } from './draw_tooltip';

const DRAW_RECTANGLE = 'draw_rectangle';
const DRAW_CIRCLE = 'draw_circle';

const mbDrawModes = MapboxDraw.modes;
mbDrawModes[DRAW_RECTANGLE] = DrawRectangle;
mbDrawModes[DRAW_CIRCLE] = DrawCircle;

export interface Props {
  drawType?: DRAW_TYPE;
  onDraw: (event: { features: Feature[] }) => void;
  mbMap: MbMap;
}

export class DrawControl extends Component<Props, {}> {
  private _isMounted = false;
  private _mbDrawControlAdded = false;
  private _mbDrawControl = new MapboxDraw({
    displayControlsDefault: false,
    modes: mbDrawModes,
  });

  componentDidUpdate() {
    this._syncDrawControl();
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._removeDrawControl();
  }

  // debounce with zero timeout needed to allow mapbox-draw finish logic to complete
  // before _removeDrawControl is called
  _syncDrawControl = _.debounce(() => {
    if (!this._isMounted) {
      return;
    }

    if (this.props.drawType) {
      this._updateDrawControl();
    } else {
      this._removeDrawControl();
    }
  }, 0);

  _removeDrawControl() {
    if (!this._mbDrawControlAdded) {
      return;
    }

    this.props.mbMap.getCanvas().style.cursor = '';
    this.props.mbMap.off('draw.create', this.props.onDraw);
    this.props.mbMap.removeControl(this._mbDrawControl);
    this._mbDrawControlAdded = false;
  }

  _updateDrawControl() {
    if (!this.props.drawType) {
      return;
    }

    if (!this._mbDrawControlAdded) {
      this.props.mbMap.addControl(this._mbDrawControl);
      this._mbDrawControlAdded = true;
      this.props.mbMap.getCanvas().style.cursor = 'crosshair';
      this.props.mbMap.on('draw.create', this.props.onDraw);
    }

    const drawMode = this._mbDrawControl.getMode();
    if (drawMode !== DRAW_RECTANGLE && this.props.drawType === DRAW_TYPE.BOUNDS) {
      this._mbDrawControl.changeMode(DRAW_RECTANGLE);
    } else if (drawMode !== DRAW_CIRCLE && this.props.drawType === DRAW_TYPE.DISTANCE) {
      this._mbDrawControl.changeMode(DRAW_CIRCLE);
    } else if (
      drawMode !== this._mbDrawControl.modes.DRAW_POLYGON &&
      this.props.drawType === DRAW_TYPE.POLYGON
    ) {
      this._mbDrawControl.changeMode(this._mbDrawControl.modes.DRAW_POLYGON);
    }
  }

  render() {
    if (!this.props.drawType) {
      return null;
    }

    return <DrawTooltip mbMap={this.props.mbMap} drawType={this.props.drawType} />;
  }
}
