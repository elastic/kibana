/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
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
    <span
      data-test-subj="closeButton"
      onClick={onClick}
      style={{
        margin: '0 10px 0 15px',
      }}
    >
      X
    </span>
  );
});

interface Props {
  dataProviders: DataProvider[];
  onDataProviderRemoved: OnDataProviderRemoved;
}

/**
 * Renders an interactive card representation of the data providers. It also
 * affords uniform UI controls for the following actions:
 * 1) removing a data provider
 * 2) temporarily disabling a data provider
 * 3) applying boolean negation to the data provider
 */
export const Providers = pure<Props>(({ dataProviders, onDataProviderRemoved }) => (
  <div
    data-test-subj="providers"
    style={{
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
    }}
  >
    {dataProviders.map(dataProvider => (
      <div
        data-test-subj="provider"
        key={dataProvider.id}
        style={{
          alignItems: 'center',
          border: '1px solid',
          borderRadius: '5px',
          display: 'flex',
          flexDirection: 'row',
          margin: '5px',
          minHeight: '50px',
          padding: '5px',
        }}
      >
        {dataProvider.render()}
        <CloseButton onDataProviderRemoved={onDataProviderRemoved} dataProvider={dataProvider} />
      </div>
    ))}
  </div>
));
