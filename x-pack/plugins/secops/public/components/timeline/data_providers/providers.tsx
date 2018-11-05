/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiPanel, EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnDataProviderRemoved } from '../events';
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

interface Props {
  dataProviders: DataProvider[];
  onDataProviderRemoved: OnDataProviderRemoved;
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
    max-width: 180px;
  }
`;

const Spacer = styled(EuiSpacer)`
  margin-left: 10px;
  margin-right: 5px;
  border-left: 1px solid #ccc;
`;

/**
 * Renders an interactive card representation of the data providers. It also
 * affords uniform UI controls for the following actions:
 * 1) removing a data provider
 * 2) temporarily disabling a data provider
 * 3) applying boolean negation to the data provider
 */
export const Providers = pure<Props>(({ dataProviders, onDataProviderRemoved }) => (
  <PanelProviders data-test-subj="providers">
    {dataProviders.map(dataProvider => (
      <PanelProvider data-test-subj="provider" key={dataProvider.id}>
        {dataProvider.render()}
        <Spacer />
        <CloseButton onDataProviderRemoved={onDataProviderRemoved} dataProvider={dataProvider} />
      </PanelProvider>
    ))}
  </PanelProviders>
));
