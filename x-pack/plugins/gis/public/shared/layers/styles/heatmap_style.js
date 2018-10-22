/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiIcon,
  EuiSuperSelect,
} from '@elastic/eui';

export class HeatmapStyle {

  static type = 'HEATMAP';

  constructor(styleDescriptor) {
    this._descriptor = styleDescriptor;
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === HeatmapStyle;
  }

  static createDescriptor(refinement) {
    return {
      type: HeatmapStyle.type,
      refinement: refinement || 'coarse'
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

  setMBPaintProperties(mbMap, pointLayerID, property) {

    let radius;
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
      { value: 'coarse', inputDisplay: 'coarse', dropdownDisplay: (<EuiIcon type="visHeatmap" size="l"/>) },
      { value: 'fine', inputDisplay: 'fine', dropdownDisplay: (<EuiIcon type="visHeatmap" size="m"/>) },
      { value: 'most_fine', inputDisplay: 'most_fine', dropdownDisplay: (<EuiIcon type="visHeatmap" size="s"/>) }
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
