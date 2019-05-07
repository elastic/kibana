/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonGroup, EuiButtonGroupProps } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';

import { FlowDirection } from '../../graphql/types';

import * as i18n from './translations';

type MyEuiButtonGroupProps = Pick<
  EuiButtonGroupProps,
  'options' | 'idSelected' | 'onChange' | 'color' | 'type'
> & {
  name?: string;
};

const MyEuiButtonGroup: React.FC<MyEuiButtonGroupProps> = EuiButtonGroup;

const getToggleButtonDirection = (id: string) => [
  {
    id: `${id}-select-flow-direction-${FlowDirection.uniDirectional}`,
    label: i18n.UNIDIRECTIONAL,
    value: FlowDirection.uniDirectional,
  },
  {
    id: `${id}-select-flow-direction-${FlowDirection.biDirectional}`,
    label: i18n.BIDIRECTIONAL,
    value: FlowDirection.biDirectional,
  },
];

interface Props {
  id: string;
  selectedDirection: FlowDirection;
  onChangeDirection: (id: string, value: FlowDirection) => void;
}

export const FlowDirectionSelect = pure<Props>(({ id, onChangeDirection, selectedDirection }) => (
  <MyEuiButtonGroup
    name={`${id}-${selectedDirection}`}
    options={getToggleButtonDirection(id)}
    idSelected={`${id}-select-flow-direction-${selectedDirection}`}
    onChange={onChangeDirection}
    color="primary"
    type="single"
  />
));
