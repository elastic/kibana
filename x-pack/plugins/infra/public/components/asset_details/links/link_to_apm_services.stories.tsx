/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';

import { decorateWithGlobalStorybookThemeProviders } from '../../../test_utils/use_global_storybook_theme';
import { DecorateWithKibanaContext } from '../__stories__/decorator';
import { LinkToApmServices, type LinkToApmServicesProps } from './link_to_apm_services';

const stories: Meta<LinkToApmServicesProps> = {
  title: 'infra/Asset Details View/Components/Links',
  decorators: [decorateWithGlobalStorybookThemeProviders, DecorateWithKibanaContext],
  component: LinkToApmServices,
  args: {
    hostName: 'host1',
    apmField: 'host.hostname',
  },
};

const TemplateApm: Story<LinkToApmServicesProps> = (args) => {
  return <LinkToApmServices {...args} />;
};

export const ApmServicesLink = TemplateApm.bind({});
ApmServicesLink.args = {
  apmField: 'services',
  hostName: 'host1',
};

export default stories;
