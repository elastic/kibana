/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { EuiPageTemplate } from '@elastic/eui';
import { ALERT_RULE_CATEGORY } from '@kbn/rule-data-utils';

import { PageTitle as Component, PageTitleProps } from './page_title';
import { alert } from '../mock/alert';

export default {
  component: Component,
  title: 'app/AlertDetails/PageTitle',
  alert,
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
  alert,
};

export const PageTitle = Template.bind({});
PageTitle.args = defaultProps;

export const PageTitleForAnomaly = Template.bind({});
PageTitleForAnomaly.args = {
  ...{
    alert: {
      ...defaultProps.alert,
      fields: {
        ...defaultProps.alert.fields,
        [ALERT_RULE_CATEGORY]: 'Anomaly',
      },
    },
  },
};

export const PageTitleUsedWithinPageTemplate = TemplateWithPageTemplate.bind({});
PageTitleUsedWithinPageTemplate.args = {
  ...defaultProps,
};
