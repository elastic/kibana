/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Props {
  dataProvider: DataProvider;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
}

import { EuiPanel } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnDataProviderRemoved, OnToggleDataProviderEnabled } from '../events';
import { Actions } from './actions';
import { DataProvider } from './data_provider';

const PanelProvider = styled(EuiPanel)`
  && {
    align-items: center;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin: 5px;
    min-height: 60px;
    padding: 5px 5px 5px 10px;
    min-width: 150px;
  }
`;

export const Provider = pure<Props>(
  ({ dataProvider, onDataProviderRemoved, onToggleDataProviderEnabled }: Props) => (
    <PanelProvider data-test-subj="provider" key={dataProvider.id}>
      {dataProvider.name}
      <Actions
        dataProvider={dataProvider}
        onDataProviderRemoved={onDataProviderRemoved}
        onToggleDataProviderEnabled={onToggleDataProviderEnabled}
      />
    </PanelProvider>
  )
);
