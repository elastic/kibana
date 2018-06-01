/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';

let idCounter = 0;

export class ALayer {

  constructor() {
    this._id = idCounter++;
  }

  getId() {
    return this._id;
  }

  getVisibility() {
    return true;
  }

  getLayerName() {
    return "foobar";
  }

  renderSmallLegend() {
    return (<span>todo</span>);
  }

  renderLargeLegend() {
    return null;
  }

  renderTOCEntry() {
    return (
      <div
        className={`layerEntry ${this.getVisibility() ? 'visible' : 'invisible'}`}
        id={this.getId()}
        data-layerid={this.getId()}
      >
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false} className="layerEntry--visibility">
            {this.renderSmallLegend()}
          </EuiFlexItem>
          <EuiFlexItem className="layerEntry--name">
            <button>
              {this.getLayerName()}
            </button>
            <div className="legendEntry">
              {this.renderLargeLegend()}
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="grab" className="grab"/>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
