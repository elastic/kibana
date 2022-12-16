/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { EuiPageTemplate } from '@elastic/eui';

import { PageTitle as Component, PageTitleProps } from './page_title';

export default {
  component: Component,
  title: 'app/AlertDetails/PageTitle',
  argTypes: {
    title: { control: 'text' },
    active: { control: 'boolean' },
  },
};

const Template: ComponentStory<typeof Component> = (props: PageTitleProps) => (
  <Component {...props} />
);

const TemplateWithPageTemplate: ComponentStory<typeof Component> = (props: PageTitleProps) => (
  <EuiPageTemplate>
    <EuiPageTemplate.Header pageTitle={<Component {...props} />} bottomBorder={false} />
  </EuiPageTemplate>
);

const defaultProps = {
  title: 'host.cpu.usage is 0.2024 in the last 1 min for all hosts. Alert when > 0.02.',
  active: true,
};

export const PageTitle = Template.bind({});
PageTitle.args = defaultProps;

export const PageTitleUsedWithinPageTemplate = TemplateWithPageTemplate.bind({});
PageTitleUsedWithinPageTemplate.args = defaultProps;
