/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { EuiPageTemplate } from '@elastic/eui';

import { PageTitleContent as Component, PageTitleContentProps } from './page_title_content';
import { alert } from '../mock/alert';

export default {
  component: Component,
  title: 'app/AlertDetails/PageTitleContent',
  alert,
};

const Template: ComponentStory<typeof Component> = (props: PageTitleContentProps) => (
  <Component {...props} />
);

const TemplateWithPageTemplate: ComponentStory<typeof Component> = (
  props: PageTitleContentProps
) => (
  <EuiPageTemplate>
    <EuiPageTemplate.Header children={<Component {...props} />} bottomBorder={false} />
  </EuiPageTemplate>
);

const defaultProps = {
  alert,
};

export const PageTitleContent = Template.bind({});
PageTitleContent.args = defaultProps;

export const PageTitleUsedWithinPageTemplate = TemplateWithPageTemplate.bind({});
PageTitleUsedWithinPageTemplate.args = {
  ...defaultProps,
};
