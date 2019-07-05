/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ActionMap,
  Container as ConstateContainer,
  ContainerProps as ConstateContainerProps,
  Omit,
} from 'constate';
import React from 'react';

interface State {
  value: boolean;
}

interface Actions {
  disable: () => void;
  enable: () => void;
  toggle: () => void;
}

const actions: ActionMap<State, Actions> = {
  disable: () => state => ({ ...state, value: false }),
  enable: () => state => ({ ...state, value: true }),
  toggle: () => state => ({ ...state, value: !state.value }),
};

export type WithBinaryProps = Omit<
  ConstateContainerProps<State, Actions>,
  'actions' | 'initialState' | 'pure'
> & {
  initialValue?: boolean;
};

export const WithBinary: React.SFC<WithBinaryProps> = ({ initialValue = false, ...props }) => (
  <ConstateContainer {...props} actions={actions} initialState={{ value: initialValue }} pure />
);
