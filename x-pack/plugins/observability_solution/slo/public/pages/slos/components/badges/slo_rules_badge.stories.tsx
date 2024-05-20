/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { EuiFlexGroup } from '@elastic/eui';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { KibanaReactStorybookDecorator } from '@kbn/observability-plugin/public';
import { SloRulesBadge as Component, Props } from './slo_rules_badge';
import { BurnRateRuleParams } from '../../../../typings';

export default {
  component: Component,
  title: 'app/SLO/Badges/SloRulesBadge',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => (
  <EuiFlexGroup gutterSize="s">
    <Component {...props} />
  </EuiFlexGroup>
);

export const WithNoRule = Template.bind({});
WithNoRule.args = { rules: [] };

export const WithLoadingRule = Template.bind({});
WithLoadingRule.args = { rules: undefined };
export const WithRule = Template.bind({});
WithRule.args = { rules: [{ name: 'rulename' }] as Array<Rule<BurnRateRuleParams>> };
