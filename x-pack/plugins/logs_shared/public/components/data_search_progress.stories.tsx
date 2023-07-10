/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PropsOf } from '@elastic/eui';
import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../test_utils/use_global_storybook_theme';
import { DataSearchProgress } from './data_search_progress';

export default {
  title: 'infra/dataSearch/DataSearchProgress',
  decorators: [
    (wrappedStory) => <div style={{ width: 400 }}>{wrappedStory()}</div>,
    decorateWithGlobalStorybookThemeProviders,
  ],
  parameters: {
    layout: 'padded',
  },
} as Meta;

type DataSearchProgressProps = PropsOf<typeof DataSearchProgress>;

const DataSearchProgressTemplate: Story<DataSearchProgressProps> = (args) => (
  <DataSearchProgress {...args} />
);

export const UndeterminedProgress = DataSearchProgressTemplate.bind({});

export const DeterminedProgress = DataSearchProgressTemplate.bind({});

DeterminedProgress.args = {
  label: 'Searching',
  maxValue: 10,
  value: 3,
};

export const CancelableDeterminedProgress = DataSearchProgressTemplate.bind({});

CancelableDeterminedProgress.args = {
  label: 'Searching',
  maxValue: 10,
  value: 3,
};
CancelableDeterminedProgress.argTypes = {
  onCancel: { action: 'canceled' },
};
