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

import { EuiButtonIcon, EuiPanel, EuiSpacer, EuiSwitch } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnDataProviderRemoved, OnToggleDataProviderEnabled } from '../events';
import { DataProvider } from './data_provider';

const PanelProvider = styled(EuiPanel)`
  && {
    align-items: center;
    display: flex;
    flex-direction: row;
    margin: 5px;
    min-height: 50px;
    padding: 5px 5px 5px 10px;
    max-width: 240px;
    min-width: 200px;
  }
`;

const FlexGroup = styled.span`
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  flex-grow: 1;
  align-items: center;
  margin-left: 5px;
`;

const Spacer = styled(EuiSpacer)`
  margin-left: 10px;
  margin-right: 0px;
  border-left: 1px solid #ccc;
`;

interface SwitchButtonProps {
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  dataProvider: DataProvider;
}

/** An affordance for enabling/disabling a data provider. It invokes `onToggleDataProviderEnabled` when clicked */
const SwitchButton = pure(({ onToggleDataProviderEnabled, dataProvider }: SwitchButtonProps) => {
  const onClick = () => {
    onToggleDataProviderEnabled({ dataProvider, enabled: !dataProvider.enabled });
  };

  return (
    <EuiSwitch
      aria-label="Toggle"
      data-test-subj="switchButton"
      defaultChecked={dataProvider.enabled}
      onClick={onClick}
    />
  );
});

interface CloseButtonProps {
  onDataProviderRemoved: OnDataProviderRemoved;
  dataProvider: DataProvider;
}

/** An affordance for removing a data provider. It invokes `onDataProviderRemoved` when clicked */
const CloseButton = pure(({ onDataProviderRemoved, dataProvider }: CloseButtonProps) => {
  const onClick = () => {
    onDataProviderRemoved(dataProvider);
  };

  return (
    <EuiButtonIcon
      data-test-subj="closeButton"
      onClick={onClick}
      iconType="cross"
      aria-label="Next"
    />
  );
});

export const Provider = pure<Props>(
  ({ dataProvider, onDataProviderRemoved, onToggleDataProviderEnabled }: Props) => (
    <PanelProvider data-test-subj="provider" key={dataProvider.id}>
      {dataProvider.name}
      <FlexGroup>
        <SwitchButton
          onToggleDataProviderEnabled={onToggleDataProviderEnabled}
          dataProvider={dataProvider}
        />
        <Spacer />
        <CloseButton onDataProviderRemoved={onDataProviderRemoved} dataProvider={dataProvider} />
      </FlexGroup>
    </PanelProvider>
  )
);
