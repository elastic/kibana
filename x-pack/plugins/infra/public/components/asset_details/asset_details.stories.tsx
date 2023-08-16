/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import type { Meta, Story } from '@storybook/react/types-6-0';
import { AssetDetails } from './asset_details';
import { decorateWithGlobalStorybookThemeProviders } from '../../test_utils/use_global_storybook_theme';
import { type AssetDetailsProps } from './types';
import { DecorateWithKibanaContext } from './__stories__/decorator';
import { assetDetailsProps } from './__stories__/context/fixtures';

const stories: Meta<AssetDetailsProps> = {
  title: 'infra/Asset Details View',
  decorators: [decorateWithGlobalStorybookThemeProviders, DecorateWithKibanaContext],
  component: AssetDetails,
  argTypes: {
    links: {
      options: assetDetailsProps.links,
      control: {
        type: 'inline-check',
      },
    },
  },
  args: {
    ...assetDetailsProps,
  },
};

const PageTemplate: Story<AssetDetailsProps> = (args) => {
  return <AssetDetails {...args} />;
};

const FlyoutTemplate: Story<AssetDetailsProps> = (args) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeFlyout = () => setIsOpen(false);
  return (
    <div>
      <EuiButton
        data-test-subj="infraFlyoutTemplateOpenFlyoutButton"
        onClick={() => setIsOpen(true)}
      >
        Open flyout
      </EuiButton>
      <div hidden={!isOpen}>{isOpen && <AssetDetails {...args} />}</div>
    </div>
  );
};

export const Page = PageTemplate.bind({});

export const Flyout = FlyoutTemplate.bind({});

export default stories;
