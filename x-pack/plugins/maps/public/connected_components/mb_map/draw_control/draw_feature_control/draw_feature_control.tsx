/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { Map as MbMap } from 'mapbox-gl';
import { i18n } from '@kbn/i18n';
import { Feature } from 'geojson';
import { getToasts } from '../../../../kibana_services';
import { DrawControl } from '../draw_control';
import { DRAW_TYPE } from "../../../../../common";

export interface Props {
  disableDrawState: () => void;
  drawType: DRAW_TYPE;
  mbMap: MbMap;
}

export class DrawFeatureControl extends Component<Props, {}> {
  _onDraw = async (e: { features: Feature[] }) => {
    try {
      console.log(e);
    } catch (error) {
      getToasts().addWarning(
        i18n.translate('xpack.maps.drawFeatureControl.unableToCreatFilter', {
          defaultMessage: `Unable to create feature, error: '{errorMsg}'.`,
          values: {
            errorMsg: error.message,
          },
        })
      );
    } finally {
      this.props.disableDrawState();
    }
  };

  render() {
    return (
      <DrawControl
        drawType={this.props.drawType}
        onDraw={this._onDraw}
        mbMap={this.props.mbMap}
      />
    );
  }
}
