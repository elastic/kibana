/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';

import { FlowDirection, FlowTarget } from '../../../../graphql/types';

import * as i18n from './translations';

const toggleTypeOptions = (id: string) => [
  {
    id: `${id}-${FlowTarget.source}`,
    value: FlowTarget.source,
    inputDisplay: i18n.BY_SOURCE_IP,
    directions: [FlowDirection.uniDirectional, FlowDirection.biDirectional],
  },
  {
    id: `${id}-${FlowTarget.destination}`,
    value: FlowTarget.destination,
    inputDisplay: i18n.BY_DESTINATION_IP,
    directions: [FlowDirection.uniDirectional, FlowDirection.biDirectional],
  },
  {
    id: `${id}-${FlowTarget.client}`,
    value: FlowTarget.client,
    inputDisplay: i18n.BY_CLIENT_IP,
    directions: [FlowDirection.biDirectional],
  },
  {
    id: `${id}-${FlowTarget.server}`,
    value: FlowTarget.server,
    inputDisplay: i18n.BY_SERVER_IP,
    directions: [FlowDirection.biDirectional],
  },
];

interface Props {
  id: string;
  selectedDirection: FlowDirection;
  selectedType: FlowTarget;
  onChangeType: (value: FlowTarget) => void;
  isLoading: boolean;
}

export const SelectType = pure<Props>(
  ({ id, isLoading = false, onChangeType, selectedDirection, selectedType }) => (
    <EuiSuperSelect
      options={toggleTypeOptions(id).filter(option =>
        option.directions.includes(selectedDirection)
      )}
      valueOfSelected={selectedType}
      onChange={onChangeType}
      isLoading={isLoading}
    />
  )
);
