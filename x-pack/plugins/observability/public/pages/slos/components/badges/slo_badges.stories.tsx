/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { EuiFlexGroup } from '@elastic/eui';
import { buildForecastedSlo } from '../../../../data/slo/slo';
import { KibanaReactStorybookDecorator } from '../../../../utils/kibana_react.storybook_decorator';
import { SloBadges as Component, Props } from './slo_badges';

export default {
  component: Component,
  title: 'app/SLO/Badges/SloBadges',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => (
  <EuiFlexGroup>
    <Component {...props} />
  </EuiFlexGroup>
);

const defaultProps = {
  slo: buildForecastedSlo(),
  rules: [],
};

export const SloBadges = Template.bind({});
SloBadges.args = defaultProps;
