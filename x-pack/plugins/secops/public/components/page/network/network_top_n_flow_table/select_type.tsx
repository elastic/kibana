/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';

import { NetworkTopNFlowDirection, NetworkTopNFlowType } from '../../../../graphql/types';
import * as i18n from './translations';

const toggleTypeOptions = [
  {
    value: NetworkTopNFlowType.source,
    inputDisplay: i18n.BY_SOURCE_IP,
    directions: [NetworkTopNFlowDirection.uniDirectional, NetworkTopNFlowDirection.biDirectional],
  },
  {
    value: NetworkTopNFlowType.destination,
    inputDisplay: i18n.BY_DESTINATION_IP,
    directions: [NetworkTopNFlowDirection.uniDirectional, NetworkTopNFlowDirection.biDirectional],
  },
  {
    value: NetworkTopNFlowType.client,
    inputDisplay: i18n.BY_CLIENT_IP,
    directions: [NetworkTopNFlowDirection.biDirectional],
  },
  {
    value: NetworkTopNFlowType.server,
    inputDisplay: i18n.BY_SERVER_IP,
    directions: [NetworkTopNFlowDirection.biDirectional],
  },
];

interface Props {
  selectedDirection: NetworkTopNFlowDirection;
  selectedType: NetworkTopNFlowType;
  onChangeType: (value: NetworkTopNFlowType) => void;
  isLoading: boolean;
}

export const SelectType = pure<Props>(
  ({ isLoading = false, onChangeType, selectedDirection, selectedType }) => (
    <EuiSuperSelect
      options={toggleTypeOptions.filter(option => option.directions.includes(selectedDirection))}
      valueOfSelected={selectedType}
      onChange={onChangeType}
      isLoading={isLoading}
    />
  )
);
