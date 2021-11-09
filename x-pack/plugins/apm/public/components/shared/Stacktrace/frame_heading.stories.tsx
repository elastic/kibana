/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { FrameHeading } from './frame_heading';

type Args = ComponentProps<typeof FrameHeading>;

const stories: Meta<Args> = {
  title: 'shared/Stacktrace/FrameHeading',
  component: FrameHeading,
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <FrameHeading {...args} />;
};
Example.args = {
  codeLanguage: 'go',
  isLibraryFrame: false,
  stackframe: {
    exclude_from_grouping: false,
    filename: 'main.go',
    abs_path: '/src/opbeans-go/main.go',
    line: { number: 196 },
    function: 'Main.func2',
    module: 'main',
  },
};
