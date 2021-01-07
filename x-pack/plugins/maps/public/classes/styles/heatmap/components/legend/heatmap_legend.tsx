/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import { i18n } from '@kbn/i18n';
import { ColorGradient } from './color_gradient';
import { RangedStyleLegendRow } from '../../../components/ranged_style_legend_row';
import { HEATMAP_COLOR_RAMP_LABEL } from '../heatmap_constants';
import { IField } from '../../../../fields/field';

interface Props {
  colorRampName: string;
  field: IField;
}

interface State {
  label: string;
}

export class HeatmapLegend extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = { label: '' };

  componentDidUpdate() {
    this._loadLabel();
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadLabel();
  }
  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadLabel() {
    const label = await this.props.field.getLabel();
    if (this._isMounted && this.state.label !== label) {
      this.setState({ label });
    }
  }

  render() {
    return (
      <RangedStyleLegendRow
        header={<ColorGradient colorPaletteId={this.props.colorRampName} />}
        minLabel={i18n.translate('xpack.maps.heatmapLegend.coldLabel', {
          defaultMessage: 'cold',
        })}
        maxLabel={i18n.translate('xpack.maps.heatmapLegend.hotLabel', {
          defaultMessage: 'hot',
        })}
        propertyLabel={HEATMAP_COLOR_RAMP_LABEL}
        fieldLabel={this.state.label}
      />
    );
  }
}
