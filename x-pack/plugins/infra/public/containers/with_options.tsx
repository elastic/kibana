/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';
import { InfraMetricType, InfraPathType } from '../../common/graphql/types';
import { InfraOptions, Omit } from '../lib/lib';

interface WithOptionsInjectedProps {
  options: InfraOptions;
}

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
    filters: [],
    metrics: [{ type: InfraMetricType.count }],
    path: [{ type: InfraPathType.hosts }],
  } as InfraOptions,
};

type State = Readonly<typeof initialState>;

export const withOptions = <P extends WithOptionsInjectedProps>(
  WrappedComponent: React.ComponentType<P>
) => {
  class WithOptions extends React.Component<Omit<P, WithOptionsInjectedProps>, State> {
    public readonly state = initialState;

    public render() {
      return <WrappedComponent {...this.props} options={this.state.options} />;
    }
  }
  return WithOptions;
};
