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
import { DRAW_SHAPE } from '../../../../common/constants';
import { DrawCircle } from './draw_circle';
import { DrawTooltip } from './draw_tooltip';

const mbModeEquivalencies = new Map<string, DRAW_SHAPE>([
  ['simple_select', DRAW_SHAPE.SIMPLE_SELECT],
  ['draw_rectangle', DRAW_SHAPE.BOUNDS],
  ['draw_circle', DRAW_SHAPE.DISTANCE],
  ['draw_polygon', DRAW_SHAPE.POLYGON],
  ['draw_line_string', DRAW_SHAPE.LINE],
  ['draw_point', DRAW_SHAPE.POINT],
]);

const DRAW_RECTANGLE = 'draw_rectangle';
const DRAW_CIRCLE = 'draw_circle';
const mbDrawModes = MapboxDraw.modes;
mbDrawModes[DRAW_RECTANGLE] = DrawRectangle;
mbDrawModes[DRAW_CIRCLE] = DrawCircle;

export interface Props {
  drawShape?: DRAW_SHAPE;
  onDraw: (event: { features: Feature[] }, drawControl?: MapboxDraw) => void;
  mbMap: MbMap;
  enable: boolean;
  updateEditShape: (shapeToDraw: DRAW_SHAPE) => void;
}

export class DrawControl extends Component<Props> {
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
    this._syncDrawControl();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._removeDrawControl();
  }

  _onDraw = (event: { features: Feature[] }) => {
    this.props.onDraw(event, this._mbDrawControl);
  };

  // debounce with zero timeout needed to allow mapbox-draw finish logic to complete
  // before _removeDrawControl is called
  _syncDrawControl = _.debounce(() => {
    if (!this._isMounted) {
      return;
    }

    if (this.props.enable) {
      this._updateDrawControl();
    } else {
      this._removeDrawControl();
    }
  }, 0);

  _onModeChange = ({ mode }: { mode: string }) => {
    if (mbModeEquivalencies.has(mode)) {
      this.props.updateEditShape(mbModeEquivalencies.get(mode)!);
    }
  };

  _removeDrawControl() {
    if (!this._mbDrawControlAdded) {
      return;
    }

    this.props.mbMap.getCanvas().style.cursor = '';
    this.props.mbMap.off('draw.modechange', this._onModeChange);
    this.props.mbMap.off('draw.create', this._onDraw);
    this.props.mbMap.removeControl(this._mbDrawControl);
    this._mbDrawControlAdded = false;
  }

  _updateDrawControl() {
    if (!this.props.drawShape) {
      return;
    }

    if (!this._mbDrawControlAdded) {
      this.props.mbMap.addControl(this._mbDrawControl);
      this._mbDrawControlAdded = true;
      this.props.mbMap.getCanvas().style.cursor = 'crosshair';
      this.props.mbMap.on('draw.modechange', this._onModeChange);
      this.props.mbMap.on('draw.create', this._onDraw);
    }

    const { DRAW_LINE_STRING, DRAW_POLYGON, DRAW_POINT, SIMPLE_SELECT } = this._mbDrawControl.modes;
    const drawMode = this._mbDrawControl.getMode();
    if (drawMode !== DRAW_RECTANGLE && this.props.drawShape === DRAW_SHAPE.BOUNDS) {
      this._mbDrawControl.changeMode(DRAW_RECTANGLE);
    } else if (drawMode !== DRAW_CIRCLE && this.props.drawShape === DRAW_SHAPE.DISTANCE) {
      this._mbDrawControl.changeMode(DRAW_CIRCLE);
    } else if (drawMode !== DRAW_POLYGON && this.props.drawShape === DRAW_SHAPE.POLYGON) {
      this._mbDrawControl.changeMode(DRAW_POLYGON);
    } else if (drawMode !== DRAW_LINE_STRING && this.props.drawShape === DRAW_SHAPE.LINE) {
      this._mbDrawControl.changeMode(DRAW_LINE_STRING);
    } else if (drawMode !== DRAW_POINT && this.props.drawShape === DRAW_SHAPE.POINT) {
      this._mbDrawControl.changeMode(DRAW_POINT);
    } else if (drawMode !== SIMPLE_SELECT && this.props.drawShape === DRAW_SHAPE.SIMPLE_SELECT) {
      this._mbDrawControl.changeMode(SIMPLE_SELECT);
    }
  }

  render() {
    if (!this.props.drawShape) {
      return null;
    }

    return <DrawTooltip mbMap={this.props.mbMap} drawShape={this.props.drawShape} />;
  }
}
