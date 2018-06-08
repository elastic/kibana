/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import eventEmitter from 'event-emitter';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';


import { VisibilityToggle } from '../components/visiblity_toggle';


let idCounter = 0;


export class ALayer {

  constructor() {

    this._id = (idCounter++).toString();
    this._visibility = true;

    this._onVisibilityChange = (visibility) => {
      this.setVisibility(visibility);
    };
  }

  getId() {
    return this._id;
  }

  getVisibility() {
    return this._visibility;
  }

  setVisibility(newVisibility) {
    if (newVisibility !== this._visibility) {
      this._visibility = newVisibility;
      this.emit('visibilityChanged', this);
    }
  }

  getLayerName() {
    throw new Error('Should implement Layer#getLayerName');
  }

  renderSmallLegend() {
    return (<span>todo</span>);
  }

  renderLargeLegend() {
    return null;
  }

  renderTOCEntry(onButtonClick) {
    return (
      <div
        className={`layerEntry`}
        id={this.getId()}
        data-layerid={this.getId()}
      >
        <EuiFlexGroup gutterSize="s" responsive={false} className={this.getVisibility() ? 'visible' : 'notvisible'}>
          <EuiFlexItem grow={false}>
            {this.renderSmallLegend()}
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="layerEntry--visibility">
            <VisibilityToggle
              checked={this.getVisibility()}
              onChange={this._onVisibilityChange}
            />
          </EuiFlexItem>
          <EuiFlexItem className="layerEntry--name">
            <button onClick={() => onButtonClick(this)}>
              {this.getLayerName()}
            </button>
            <div className="legendEntry">
              {this.renderLargeLegend()}
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span className="grab"><EuiIcon type="grab" className="grab"/></span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}

eventEmitter(ALayer.prototype);
