/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnDataProviderRemoved, OnToggleDataProviderEnabled } from '../events';
import { CloseButton } from './close_button';
import { DataProvider } from './data_provider';
import { SwitchButton } from './switch_button';

interface Props {
  dataProvider: DataProvider;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
}

const Spacer = styled(EuiSpacer)`
  border-left: 1px solid #ccc;
  margin: 0 5px 0 5px;
`;

const ActionsContainer = styled.div`
  display: flex;
  flex-direction: row;
`;

/**
 * Renders an interactive card representation of the data providers. It also
 * affords uniform UI controls for the following actions:
 * 1) removing a data provider
 * 2) temporarily disabling a data provider
 * 3) TODO: applying boolean negation to the data provider
 */
export const Actions = pure<Props>(
  ({ dataProvider, onDataProviderRemoved, onToggleDataProviderEnabled }: Props) => (
    <ActionsContainer data-test-subj="data-provider-actions">
      <SwitchButton
        data-test-subj="data-provider-action-toggle-enabled"
        dataProvider={dataProvider}
        onToggleDataProviderEnabled={onToggleDataProviderEnabled}
      />
      <Spacer />
      <CloseButton
        data-test-subj="data-provider-action-close"
        dataProvider={dataProvider}
        onDataProviderRemoved={onDataProviderRemoved}
      />
    </ActionsContainer>
  )
);
