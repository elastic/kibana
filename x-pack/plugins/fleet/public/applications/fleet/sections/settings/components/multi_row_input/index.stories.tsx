/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from '@storybook/addons';
import { addParameters } from '@storybook/react';
import React from 'react';

import { MultiRowInput as Component } from '.';

addParameters({
  options: {
    enableShortcuts: false,
  },
});

export default {
  component: Component,
  title: 'Sections/Fleet/Settings/MultiRowInput',
};

interface Args {
  width: number;
  label: string;
  helpText: string;
  disabled: boolean;
}

const args: Args = {
  width: 250,
  label: 'Demo label',
  helpText: 'Demo helpText',
  disabled: false,
};

export const HostsInput = ({ width, label, helpText, disabled }: Args) => {
  const [value, setValue] = useState<string[]>([]);
  return (
    <div style={{ width }}>
      <Component
        id="test-host-input"
        helpText={helpText}
        value={value}
        onChange={setValue}
        label={label}
        disabled={disabled}
      />
    </div>
  );
};
HostsInput.args = args;

export const HostsInputDisabled = ({ value }: { value: string[] }) => {
  return (
    <div style={{ maxWidth: '350px' }}>
      <Component
        id="test-host-input"
        helpText={'Host input help text'}
        value={value}
        onChange={() => {}}
        label={'Host input label'}
        disabled={true}
      />
    </div>
  );
};

HostsInputDisabled.args = { value: ['http://test1.fr', 'http://test2.fr'] };
HostsInputDisabled.argTypes = {
  value: {
    control: { type: 'object' },
  },
};
