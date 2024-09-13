/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, ReactNode } from 'react';

import { i18n } from '@kbn/i18n';
import { ColorGradient } from './color_gradient';
import { RangedStyleLegendRow } from '../../../components/ranged_style_legend_row';
import { HEATMAP_COLOR_RAMP_LABEL } from '../heatmap_constants';
import type { IField } from '../../../../fields/field';
import type { IESAggField } from '../../../../fields/agg';
import { MaskLegend } from '../../../vector/components/legend/mask_legend';

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
    const metricLegend = (
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
        invert={false}
      />
    );

    let maskLegend: ReactNode | undefined;
    if ('getMask' in (this.props.field as IESAggField)) {
      const mask = (this.props.field as IESAggField).getMask();
      if (mask) {
        maskLegend = (
          <MaskLegend
            esAggField={this.props.field as IESAggField}
            operator={mask.operator}
            value={mask.value}
          />
        );
      }
    }

    return maskLegend ? (
      <>
        {maskLegend}
        {metricLegend}
      </>
    ) : (
      metricLegend
    );
  }
}
