/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Story } from '@storybook/react';
import { StorybookProviders } from '../../common/mock/storybook_providers';
import { AssetCriticalitySelector } from './asset_criticality_selector';

export default {
  component: () => <AssetCriticalitySelector />,
  title: 'AssetCriticalitySelector',
};

export const Default: Story<void> = () => {
  return (
    <StorybookProviders>
      {' '}
      <AssetCriticalitySelector />
    </StorybookProviders>
  );
};
