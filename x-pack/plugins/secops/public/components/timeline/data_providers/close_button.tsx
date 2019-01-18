/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

import { OnDataProviderRemoved } from '../events';
import { DataProvider } from './data_provider';
import * as i18n from './translations';

interface Props {
  onDataProviderRemoved: OnDataProviderRemoved;
  dataProvider: DataProvider;
}

/** An affordance for removing a data provider. It invokes `onDataProviderRemoved` when clicked */
export const CloseButton = pure<Props>(({ onDataProviderRemoved, dataProvider }) => {
  const onClick = () => {
    onDataProviderRemoved(dataProvider.id);
  };

  return (
    <EuiButtonIcon
      data-test-subj="closeButton"
      onClick={onClick}
      iconType="cross"
      aria-label={i18n.REMOVE_DATA_PROVIDER}
    />
  );
});
