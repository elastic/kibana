/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { DataProviders } from '../data_providers';
import { DataProvider } from '../data_providers/data_provider';
import { OnDataProviderRemoved, OnToggleDataProviderEnabled } from '../events';

interface Props {
  id: string;
  dataProviders: DataProvider[];
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  width: number;
}

const Header = styled.header<{ width: string }>`
  display: 'flex';
  flex-direction: 'column';
  width: ${props => props.width};
`;

export const TimelineHeader = pure<Props>(
  ({ id, dataProviders, onDataProviderRemoved, onToggleDataProviderEnabled, width }) => (
    <Header data-test-subj="timelineHeader" width={`${width}px`}>
      <DataProviders
        id={id}
        dataProviders={dataProviders}
        onDataProviderRemoved={onDataProviderRemoved}
        onToggleDataProviderEnabled={onToggleDataProviderEnabled}
      />
    </Header>
  )
);
