/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';

import { euiPaletteColorBlind } from '@elastic/eui';
import { InfraFormatterType, InfraOptions, InfraWaffleMapLegendMode } from '../lib/lib';
import { RendererFunction } from '../utils/typed_react';

const euiVisColorPalette = euiPaletteColorBlind();

const initialState = {
  options: {
    timerange: {
      interval: '1m',
      to: moment.utc().valueOf(),
      from: moment
        .utc()
        .subtract(1, 'h')
        .valueOf(),
    },
    wafflemap: {
      formatter: InfraFormatterType.percent,
      formatTemplate: '{{value}}',
      metric: { type: 'cpu' },
      groupBy: [],
      legend: {
        type: InfraWaffleMapLegendMode.gradient,
        rules: [
          {
            value: 0,
            color: '#D3DAE6',
          },
          {
            value: 1,
            color: euiVisColorPalette[1],
          },
        ],
      },
    },
  } as InfraOptions,
};

interface WithOptionsProps {
  children: RendererFunction<InfraOptions>;
}

type State = Readonly<typeof initialState>;

export const withOptions = (WrappedComponent: React.ComponentType<InfraOptions>) => (
  <WithOptions>{args => <WrappedComponent {...args} />}</WithOptions>
);

export class WithOptions extends React.Component<WithOptionsProps, State> {
  public readonly state: State = initialState;

  public render() {
    return this.props.children(this.state.options);
  }
}
