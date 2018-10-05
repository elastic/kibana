/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';

import { InfraMetricType, InfraPathType } from '../../common/graphql/types';
import {
  InfraFormatterType,
  InfraOptions,
  InfraWaffleMapLegendMode,
  // InfraWaffleMapRuleOperator,
} from '../lib/lib';
import { RendererFunction } from '../utils/typed_react';

const initialState = {
  options: {
    sourceId: 'default',
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
      metric: { type: InfraMetricType.cpu },
      path: [{ type: InfraPathType.hosts }],
      /*
      legend: {
        type: InfraWaffleMapLegendMode.step,
        rules: [
          {
            value: 0,
            color: '#00B3A4',
            operator: InfraWaffleMapRuleOperator.gte,
            label: 'Ok',
          },
          {
            value: 10000,
            color: '#DB1374',
            operator: InfraWaffleMapRuleOperator.gte,
            label: 'Over 10,000',
          },
        ],
      },
      */
      legend: {
        type: InfraWaffleMapLegendMode.gradient,
        rules: [
          {
            value: 0,
            color: '#D9D9D9',
          },
          {
            value: 0.65,
            color: '#00B3A4',
          },
          {
            value: 0.8,
            color: '#E6C220',
          },
          {
            value: 1,
            color: '#DB1374',
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

export const withOptions = <P extends InfraOptions>(WrappedComponent: React.ComponentType<P>) => (
  <WithOptions>{args => <WrappedComponent {...args} />}</WithOptions>
);

export class WithOptions extends React.Component<WithOptionsProps, State> {
  public readonly state: State = initialState;

  public render() {
    return this.props.children(this.state.options);
  }
}
