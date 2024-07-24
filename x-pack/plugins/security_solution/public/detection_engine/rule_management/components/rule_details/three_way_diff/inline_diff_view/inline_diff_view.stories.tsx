/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { InlineDiffView } from './inline_diff_view';
import { DiffMethod } from '../../json_diff/mark_edits';

export default {
  component: InlineDiffView,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/InlineDiffView',
  argTypes: {
    oldSource: {
      control: 'text',
      description: 'Old source to compare',
      defaultValue: '',
    },
    newSource: {
      control: 'text',
      description: 'New source to compare',
      defaultValue: '',
    },
  },
};

const Template: Story<{ oldSource: string; newSource: string }> = (args) => {
  return (
    <InlineDiffView
      oldSource={args.oldSource}
      newSource={args.newSource}
      diffMethod={DiffMethod.WORDS_WITH_SPACE}
    />
  );
};

export const Default = Template.bind({});

export const SameEmpty = Template.bind({});
SameEmpty.args = {
  oldSource: '',
  newSource: '',
};

export const SameSingleLine = Template.bind({});
SameSingleLine.args = {
  oldSource: 'hello',
  newSource: 'hello',
};

export const SameMultiLine = Template.bind({});
SameMultiLine.args = {
  oldSource: `hello
how are
you

extra line
additional line

1
2
3

a
b
c

This is a drill`,
  newSource: `hello
how are
you

extra line
additional line

1
2
3

a
b
c

This is a drill`,
};

export const Different = Template.bind({});
Different.args = {
  oldSource: `hello
how are
you

extra line
additional line

1
2
3

a
b
c

This is a drill`,
  newSource: `hello
how were
you

extra line
additional line

1
2
3

a
b
c

This is a test`,
};
