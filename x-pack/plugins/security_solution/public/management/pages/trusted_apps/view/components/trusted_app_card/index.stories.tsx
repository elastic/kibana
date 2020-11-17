/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { storiesOf, addDecorator } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { KibanaContextProvider } from '../../../../../../../../../../src/plugins/kibana_react/public';
import {
  ConditionEntryField,
  TrustedApp,
  WindowsConditionEntry,
} from '../../../../../../../common/endpoint/types';

import { createSampleTrustedApp } from '../../../test_utils';

import { TrustedAppCard } from '.';

addDecorator((storyFn) => (
  <KibanaContextProvider services={{ uiSettings: { get: () => 'MMM D, YYYY @ HH:mm:ss.SSS' } }}>
    <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
      {storyFn()}
    </ThemeProvider>
  </KibanaContextProvider>
));

const PATH_CONDITION: WindowsConditionEntry = {
  field: ConditionEntryField.PATH,
  operator: 'included',
  type: 'match',
  value: '/some/path/on/file/system',
};

const SIGNER_CONDITION: WindowsConditionEntry = {
  field: ConditionEntryField.SIGNER,
  operator: 'included',
  type: 'match',
  value: 'Elastic',
};

storiesOf('TrustedApps/TrustedAppCard', module)
  .add('default', () => {
    const trustedApp: TrustedApp = createSampleTrustedApp(5);
    trustedApp.created_at = '2020-09-17T14:52:33.899Z';
    trustedApp.entries = [PATH_CONDITION];

    return <TrustedAppCard trustedApp={trustedApp} onDelete={action('onClick')} />;
  })
  .add('multiple entries', () => {
    const trustedApp: TrustedApp = createSampleTrustedApp(5);
    trustedApp.created_at = '2020-09-17T14:52:33.899Z';
    trustedApp.entries = [PATH_CONDITION, SIGNER_CONDITION];

    return <TrustedAppCard trustedApp={trustedApp} onDelete={action('onClick')} />;
  })
  .add('longs texts', () => {
    const trustedApp: TrustedApp = createSampleTrustedApp(5, true);
    trustedApp.created_at = '2020-09-17T14:52:33.899Z';
    trustedApp.entries = [PATH_CONDITION, SIGNER_CONDITION];

    return <TrustedAppCard trustedApp={trustedApp} onDelete={action('onClick')} />;
  });
