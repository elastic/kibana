/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { addDecorator, storiesOf } from '@storybook/react';
import { euiLightVars } from '@kbn/ui-theme';
import { EuiCheckbox, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';

import { OperatingSystem } from '@kbn/securitysolution-utils';

import { ConfigForm } from '.';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

storiesOf('PolicyDetails/ConfigForm', module)
  .add('One OS', () => {
    return (
      <ConfigForm type="Type 1" supportedOss={[OperatingSystem.WINDOWS]}>
        {'Some content'}
      </ConfigForm>
    );
  })
  .add('Multiple OSs', () => {
    return (
      <ConfigForm
        type="Type 1"
        supportedOss={[OperatingSystem.WINDOWS, OperatingSystem.MAC, OperatingSystem.LINUX]}
      >
        {'Some content'}
      </ConfigForm>
    );
  })
  .add('Complex content', () => {
    return (
      <ConfigForm type="Type 1" supportedOss={[OperatingSystem.MAC, OperatingSystem.LINUX]}>
        <EuiText>
          {'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore ' +
            'et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut ' +
            'aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum ' +
            'dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia ' +
            'deserunt mollit anim id est laborum.'}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiSwitch label={'Switch'} checked={true} onChange={() => {}} />
        <EuiSpacer size="s" />
        <EuiCheckbox id="1" label={'Checkbox 1'} checked={false} onChange={() => {}} />
        <EuiCheckbox id="2" label={'Checkbox 2'} checked={true} onChange={() => {}} />
        <EuiCheckbox id="3" label={'Checkbox 3'} checked={true} onChange={() => {}} />
      </ConfigForm>
    );
  })
  .add('Right corner content', () => {
    const toggle = <EuiSwitch label={'Switch'} checked={true} onChange={() => {}} />;

    return (
      <ConfigForm type="Type 1" supportedOss={[OperatingSystem.LINUX]} rightCorner={toggle}>
        {'Some content'}
      </ConfigForm>
    );
  });
