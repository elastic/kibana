/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { DRAW_TYPE } from '../../../../../common/constants';
import MapboxDraw from '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw-unminified';
import DrawRectangle from 'mapbox-gl-draw-rectangle-mode';
import { DrawCircle } from './draw_circle';
import {
  createDistanceFilterWithMeta,
  createSpatialFilterWithGeometry,
  getBoundingBoxGeometry,
  roundCoordinates,
} from '../../../../../common/elasticsearch_geo_utils';
import { DrawTooltip } from './draw_tooltip';

const DRAW_RECTANGLE = 'draw_rectangle';
const DRAW_CIRCLE = 'draw_circle';

const mbDrawModes = MapboxDraw.modes;
mbDrawModes[DRAW_RECTANGLE] = DrawRectangle;
mbDrawModes[DRAW_CIRCLE] = DrawCircle;

export class DrawControl extends React.Component {
  constructor() {
    super();
    this._mbDrawControl = new MapboxDraw({
      displayControlsDefault: false,
      modes: mbDrawModes,
    });
    this._mbDrawControlAdded = false;
  }

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

    if (this.props.isDrawingFilter) {
      this._updateDrawControl();
    } else {
      this._removeDrawControl();
    }
  }, 0);

  _onDraw = async (e) => {
    if (!e.features.length) {
      return;
    }

    let filter;
    if (this.props.drawState.drawType === DRAW_TYPE.DISTANCE) {
      const circle = e.features[0];
      const distanceKm = _.round(
        circle.properties.radiusKm,
        circle.properties.radiusKm > 10 ? 0 : 2
      );
      // Only include as much precision as needed for distance
      let precision = 2;
      if (distanceKm <= 1) {
        precision = 5;
      } else if (distanceKm <= 10) {
        precision = 4;
      } else if (distanceKm <= 100) {
        precision = 3;
      }
      filter = createDistanceFilterWithMeta({
        alias: this.props.drawState.filterLabel,
        distanceKm,
        geoFieldName: this.props.drawState.geoFieldName,
        indexPatternId: this.props.drawState.indexPatternId,
        point: [
          _.round(circle.properties.center[0], precision),
          _.round(circle.properties.center[1], precision),
        ],
      });
    } else {
      const geometry = e.features[0].geometry;
      // MapboxDraw returns coordinates with 12 decimals. Round to a more reasonable number
      roundCoordinates(geometry.coordinates);

      filter = createSpatialFilterWithGeometry({
        geometry:
          this.props.drawState.drawType === DRAW_TYPE.BOUNDS
            ? getBoundingBoxGeometry(geometry)
            : geometry,
        indexPatternId: this.props.drawState.indexPatternId,
        geoFieldName: this.props.drawState.geoFieldName,
        geoFieldType: this.props.drawState.geoFieldType,
        geometryLabel: this.props.drawState.geometryLabel,
        relation: this.props.drawState.relation,
      });
    }

    try {
      await this.props.addFilters([filter], this.props.drawState.actionId);
    } catch (error) {
      // TODO notify user why filter was not created
      console.error(error);
    } finally {
      this.props.disableDrawState();
    }
  };

  _removeDrawControl() {
    if (!this.props.mbMap || !this._mbDrawControlAdded) {
      return;
    }

    this.props.mbMap.getCanvas().style.cursor = '';
    this.props.mbMap.off('draw.create', this._onDraw);
    this.props.mbMap.removeControl(this._mbDrawControl);
    this._mbDrawControlAdded = false;
  }

  _updateDrawControl() {
    if (!this.props.mbMap) {
      return;
    }

    if (!this._mbDrawControlAdded) {
      this.props.mbMap.addControl(this._mbDrawControl);
      this._mbDrawControlAdded = true;
      this.props.mbMap.getCanvas().style.cursor = 'crosshair';
      this.props.mbMap.on('draw.create', this._onDraw);
    }

    const drawMode = this._mbDrawControl.getMode();
    if (drawMode !== DRAW_RECTANGLE && this.props.drawState.drawType === DRAW_TYPE.BOUNDS) {
      this._mbDrawControl.changeMode(DRAW_RECTANGLE);
    } else if (drawMode !== DRAW_CIRCLE && this.props.drawState.drawType === DRAW_TYPE.DISTANCE) {
      this._mbDrawControl.changeMode(DRAW_CIRCLE);
    } else if (
      drawMode !== this._mbDrawControl.modes.DRAW_POLYGON &&
      this.props.drawState.drawType === DRAW_TYPE.POLYGON
    ) {
      this._mbDrawControl.changeMode(this._mbDrawControl.modes.DRAW_POLYGON);
    }
  }

  render() {
    if (!this.props.mbMap || !this.props.isDrawingFilter) {
      return null;
    }

    return <DrawTooltip mbMap={this.props.mbMap} drawState={this.props.drawState} />;
  }
}
