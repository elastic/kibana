/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiPanel, EuiSpacer, EuiSwitch } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnDataProviderRemoved, OnToggleDataProviderEnabled } from '../events';
import { DataProvider } from './data_provider';

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

interface Props {
  dataProviders: DataProvider[];
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
}

const PanelProviders = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

const PanelProvider = styled(EuiPanel)`
  && {
    align-items: center;
    display: flex;
    flex-direction: row;
    margin: 5px;
    min-height: 50px;
    padding: 5px 5px 5px 10px;
    max-width: 240px;
  }
`;

const Spacer = styled(EuiSpacer)`
  margin-left: 10px;
  margin-right: 0px;
  border-left: 1px solid #ccc;
`;

const FlexGroup = styled.span`
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  flex-grow: 1;
  align-items: center;
`;

/**
 * Renders an interactive card representation of the data providers. It also
 * affords uniform UI controls for the following actions:
 * 1) removing a data provider
 * 2) temporarily disabling a data provider
 * 3) applying boolean negation to the data provider
 */
export const Providers = pure<Props>(
  ({ dataProviders, onDataProviderRemoved, onToggleDataProviderEnabled }) => (
    <PanelProviders data-test-subj="providers">
      {dataProviders.map(dataProvider => (
        <PanelProvider data-test-subj="provider" key={dataProvider.id}>
          {dataProvider.render()}
          <FlexGroup>
            <SwitchButton
              onToggleDataProviderEnabled={onToggleDataProviderEnabled}
              dataProvider={dataProvider}
            />
            <Spacer />
            <CloseButton
              onDataProviderRemoved={onDataProviderRemoved}
              dataProvider={dataProvider}
            />
          </FlexGroup>
        </PanelProvider>
      ))}
    </PanelProviders>
  )
);
