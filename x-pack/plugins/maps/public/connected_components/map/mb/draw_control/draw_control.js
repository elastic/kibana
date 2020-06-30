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
} from '../../../../elasticsearch_geo_utils';
import { DrawTooltip } from './draw_tooltip';

const mbDrawModes = MapboxDraw.modes;
mbDrawModes.draw_rectangle = DrawRectangle;
mbDrawModes.draw_circle = DrawCircle;

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

  _syncDrawControl = _.debounce(() => {
    if (!this.props.mbMap) {
      return;
    }

    if (this.props.isDrawingFilter) {
      this._updateDrawControl();
    } else {
      this._removeDrawControl();
    }
  }, 256);

  _onDraw = (e) => {
    if (!e.features.length) {
      return;
    }

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
      const filter = createDistanceFilterWithMeta({
        alias: this.props.drawState.filterLabel,
        distanceKm,
        geoFieldName: this.props.drawState.geoFieldName,
        indexPatternId: this.props.drawState.indexPatternId,
        point: [
          _.round(circle.properties.center[0], precision),
          _.round(circle.properties.center[1], precision),
        ],
      });
      this.props.addFilters([filter]);
      this.props.disableDrawState();
      return;
    }

    const geometry = e.features[0].geometry;
    // MapboxDraw returns coordinates with 12 decimals. Round to a more reasonable number
    roundCoordinates(geometry.coordinates);

    try {
      const filter = createSpatialFilterWithGeometry({
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
      this.props.addFilters([filter]);
    } catch (error) {
      // TODO notify user why filter was not created
      console.error(error);
    } finally {
      this.props.disableDrawState();
    }
  };

  _removeDrawControl() {
    if (!this._mbDrawControlAdded) {
      return;
    }

    this.props.mbMap.getCanvas().style.cursor = '';
    this.props.mbMap.off('draw.create', this._onDraw);
    this.props.mbMap.removeControl(this._mbDrawControl);
    this._mbDrawControlAdded = false;
  }

  _updateDrawControl() {
    if (!this._mbDrawControlAdded) {
      this.props.mbMap.addControl(this._mbDrawControl);
      this._mbDrawControlAdded = true;
      this.props.mbMap.getCanvas().style.cursor = 'crosshair';
      this.props.mbMap.on('draw.create', this._onDraw);
    }

    if (this.props.drawState.drawType === DRAW_TYPE.BOUNDS) {
      this._mbDrawControl.changeMode('draw_rectangle');
    } else if (this.props.drawState.drawType === DRAW_TYPE.DISTANCE) {
      this._mbDrawControl.changeMode('draw_circle');
    } else if (this.props.drawState.drawType === DRAW_TYPE.POLYGON) {
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
