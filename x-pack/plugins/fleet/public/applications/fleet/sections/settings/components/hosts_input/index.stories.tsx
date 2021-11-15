/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from '@storybook/addons';
import { addParameters } from '@storybook/react';
import React from 'react';

import { HostsInput as Component } from '.';

addParameters({
  options: {
    enableShortcuts: false,
  },
});

export default {
  component: Component,
  title: 'Sections/Fleet/Settings',
};

interface Args {
  width: number;
  label: string;
  helpText: string;
}

const args: Args = {
  width: 250,
  label: 'Demo label',
  helpText: 'Demo helpText',
};

export const HostsInput = ({ width, label, helpText }: Args) => {
  const [value, setValue] = useState<string[]>([]);
  return (
    <div style={{ width }}>
      <Component
        id="test-host-input"
        helpText={helpText}
        value={value}
        onChange={setValue}
        label={label}
      />
    </div>
  );
};

HostsInput.args = args;
