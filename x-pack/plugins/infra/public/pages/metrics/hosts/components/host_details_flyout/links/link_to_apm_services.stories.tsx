/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../../../test_utils/use_global_storybook_theme';
import { LinkToApmServices, type LinkToApmServicesProps } from './link_to_apm_services';

const mockServices = {
  application: {
    currentAppId$: { title: 'infra', subscribe: () => {} },
    navigateToUrl: () => {},
  },
  http: {
    basePath: {
      prepend: (_: string) => '',
    },
    patch: () => {},
  },
};

export default {
  title: 'infra/Host Details View/Components/Links',
  decorators: [
    (wrappedStory) => <EuiCard title="Link to APM Services">{wrappedStory()}</EuiCard>,
    (wrappedStory) => (
      <I18nProvider>
        <KibanaContextProvider services={mockServices}>{wrappedStory()}</KibanaContextProvider>
      </I18nProvider>
    ),
    decorateWithGlobalStorybookThemeProviders,
  ],
  component: LinkToApmServices,
  args: {
    hostName: 'host1',
    apmField: 'host.hostname',
  },
} as Meta;

const TemplateApm: Story<LinkToApmServicesProps> = (args) => {
  return <LinkToApmServices {...args} />;
};

export const ApmServicesLink = TemplateApm.bind({});
ApmServicesLink.args = {
  apmField: 'services',
  hostName: 'host1',
};
