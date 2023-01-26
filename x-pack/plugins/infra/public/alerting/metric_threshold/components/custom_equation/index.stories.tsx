/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { TimeUnitChar } from '@kbn/observability-plugin/common';
import { Aggregators, Comparator } from '../../../../../common/alerting/metrics';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../test_utils/use_global_storybook_theme';
import { CustomEquationEditor, CustomEquationEditorProps } from '.';
import { aggregationType } from '../expression_row';

export default {
  title: 'infra/alerting/CustomEquationEditor',
  decorators: [
    (wrappedStory) => <div style={{ width: 550 }}>{wrappedStory()}</div>,
    decorateWithGlobalStorybookThemeProviders,
  ],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onChange: { action: 'changed' },
  },
} as Meta;

const CustomEquationEditorTemplate: Story<CustomEquationEditorProps> = (args) => (
  <CustomEquationEditor {...args} />
);

export const CustomEquationEditorDefault = CustomEquationEditorTemplate.bind({});
export const CustomEquationEditorWithEquationErrors = CustomEquationEditorTemplate.bind({});

const BASE_ARGS = {
  expression: {
    aggType: Aggregators.CUSTOM,
    timeSize: 1,
    timeUnit: 'm' as TimeUnitChar,
    threshold: [1],
    comparator: Comparator.GT,
  },
  fields: [
    { name: 'system.cpu.user.pct', normalizedType: 'number' },
    { name: 'system.cpu.system.pct', normalizedType: 'number' },
    { name: 'system.cpu.cores', normalizedType: 'number' },
  ],
  aggregationTypes: aggregationType,
};

CustomEquationEditorDefault.args = {
  ...BASE_ARGS,
  errors: {},
};

CustomEquationEditorWithEquationErrors.args = {
  ...BASE_ARGS,
  errors: {
    equation:
      'The equation field only supports the following characters: A-Z, +, -, /, *, (, ), ?, !, &, :, |, >, <, =',
  },
};
