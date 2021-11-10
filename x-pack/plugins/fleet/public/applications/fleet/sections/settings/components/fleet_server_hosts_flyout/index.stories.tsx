/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addParameters } from '@storybook/react';
import React from 'react';

import { FleetServerHostsFlyout as Component } from '.';

addParameters({
  docs: {
    inlineStories: false,
  },
});
export default {
  component: Component,
  title: 'Sections/Fleet/Settings',
};

interface Args {
  width: number;
}

const args: Args = {
  width: 1200,
};

export const FleetServerHostsFlyout = ({ width }: Args) => {
  return (
    <div style={{ width }}>
      <Component onClose={() => {}} />
    </div>
  );
};

FleetServerHostsFlyout.args = args;
