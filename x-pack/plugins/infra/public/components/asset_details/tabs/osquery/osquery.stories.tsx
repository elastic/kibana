/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, Story } from '@storybook/react/types-6-0';

import { OSQuery, type OSQueryProps } from './osquery';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../test_utils/use_global_storybook_theme';
import { DecorateWithKibanaContext } from '../../__stories__/decorator';

const stories: Meta<OSQueryProps> = {
  title: 'infra/Asset Details View/Components/OsQuery',
  decorators: [decorateWithGlobalStorybookThemeProviders, DecorateWithKibanaContext],
  component: OSQuery,
  args: {
    currentTimeRange: {
      from: 1679316685686,
      to: 1679585836087,
      interval: '1m',
    },
    nodeName: 'host-1',
    nodeType: 'host',
  },
};

const Template: Story<OSQueryProps> = (args) => {
  return <OSQuery {...args} />;
};

export const Default = Template.bind({});

export default stories;
