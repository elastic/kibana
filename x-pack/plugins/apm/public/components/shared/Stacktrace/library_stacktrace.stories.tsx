/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { LibraryStacktrace } from './library_stacktrace';

type Args = ComponentProps<typeof LibraryStacktrace>;

const stories: Meta<Args> = {
  title: 'shared/Stacktrace/LibraryStacktrace',
  component: LibraryStacktrace,
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <LibraryStacktrace {...args} />;
};
Example.args = {};
