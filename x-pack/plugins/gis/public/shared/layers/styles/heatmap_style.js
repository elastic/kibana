/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiSuperSelect,
} from '@elastic/eui';

import { getDefaultStyleProperties } from './style_defaults';

export class HeatmapStyle {

  static type = 'HEATMAP';

  constructor(styleDescriptor = {}) {
    this._descriptor = HeatmapStyle.createDescriptor(
      styleDescriptor.refinement,
      styleDescriptor.properties
    );
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === HeatmapStyle;
  }

  static createDescriptor(refinement, properties = {}) {
    return {
      type: HeatmapStyle.type,
      refinement: refinement || 'coarse',
      properties: {
        ...getDefaultStyleProperties(),
        ...properties
      }
    };
  }

  static getDisplayName() {
    return 'Heatmap style';
  }

  static renderEditor({ style, handleStyleChange }) {

    const onChange = (refinement) => {
      const styleDescriptor = HeatmapStyle.createDescriptor(refinement);
      handleStyleChange(styleDescriptor);
    };

    return (<HeatmapEditor seedRefinement={style.getRefinement()} onRefinementChange={onChange} />);

  }

  _getMBOpacity() {
    return this._descriptor.properties.alphaValue;
  }

  setMBPaintProperties(mbMap, pointLayerID, property) {

    let radius;
    const opacity = this._getMBOpacity();
    if (this._descriptor.refinement === 'coarse') {
      radius = 64;
    } else if (this._descriptor.refinement === 'fine') {
      radius = 32;
    } else if (this._descriptor.refinement === 'most_fine') {
      radius = 16;
    } else {
      throw new Error(`Refinement param not recognized: ${this._descriptor.refinement}`);
    }
    mbMap.setPaintProperty(pointLayerID, 'heatmap-radius', radius);
    mbMap.setPaintProperty(pointLayerID, 'heatmap-weight', {
      "type": 'identity',
      "property": property
    });
    mbMap.setPaintProperty(pointLayerID, 'heatmap-opacity', opacity);
  }

  getRefinement() {
    return this._descriptor.refinement;
  }

  getPrecisionRefinementDelta() {
    let refinementFactor;
    if (this._descriptor.refinement === 'coarse') {
      refinementFactor = 0;
    } else if (this._descriptor.refinement === 'fine') {
      refinementFactor = 1;
    } else if (this._descriptor.refinement === 'most_fine') {
      refinementFactor = 2;
    } else {
      throw new Error(`Refinement param not recognized: ${this._descriptor.refinement}`);
    }
    return refinementFactor;
  }

}


class HeatmapEditor extends React.Component {

  constructor() {
    super();
    this.state =  {
      refinement: null
    };
  }

  render() {

    const options = [
      { value: 'coarse', inputDisplay: 'coarse' },
      { value: 'fine', inputDisplay: 'fine' },
      { value: 'most_fine', inputDisplay: 'finest' }
    ];

    const onChange = (value) => {
      this.setState({
        refinement: value
      });
      this.props.onRefinementChange(value);
    };

    const refinement = this.state.refinement === null ?  this.props.seedRefinement  : this.state.refinement;

    return (
      <div>
        <EuiSuperSelect options={options} valueOfSelected={refinement} onChange={onChange} />
      </div>
    );
  }
}
