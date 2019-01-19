/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSwitch } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

import { OnToggleDataProviderEnabled } from '../events';
import { DataProvider } from './data_provider';
import * as i18n from './translations';

interface Props {
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  dataProvider: DataProvider;
}

/** An affordance for enabling/disabling a data provider. It invokes `onToggleDataProviderEnabled` when clicked */
export const SwitchButton = pure<Props>(({ onToggleDataProviderEnabled, dataProvider }) => {
  const onClick = () => {
    onToggleDataProviderEnabled({ dataProvider, enabled: !dataProvider.enabled });
  };

  return (
    <EuiSwitch
      aria-label={i18n.TOGGLE}
      data-test-subj="switchButton"
      defaultChecked={dataProvider.enabled}
      onClick={onClick}
    />
  );
});
