/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { RollupInterval } from '@kbn/apm-data-access-plugin/common/rollup';
import { TableRollupOptions } from './table_rollup_options';

type Args = React.ComponentProps<typeof TableRollupOptions>;

const stories: Meta<Args> = {
  title: 'shared/TableRollupOptions',
  component: TableRollupOptions,
  argTypes: {
    rollupInterval: {
      control: {
        type: 'select',
        options: [
          RollupInterval.OneMinute,
          RollupInterval.TenMinutes,
          RollupInterval.SixtyMinutes,
          RollupInterval.None,
        ],
      },
    },
  },
};

export default stories;

export const Example: StoryFn<Args> = ({ rollupInterval }) => {
  return <TableRollupOptions rollupInterval={rollupInterval} onRollupIntervalChange={() => {}} />;
};

Example.args = {
  rollupInterval: RollupInterval.OneMinute,
};
