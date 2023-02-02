/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '../../../../utils/kibana_react.storybook_decorator';
import { SloStatusBadge as Component, SloStatusProps } from './slo_status_badge';
import { buildSlo } from '../../../../data/slo/slo';

export default {
  component: Component,
  title: 'app/SLO/ListPage/Badges/SloStatusBadge',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: SloStatusProps) => (
  <Component {...props} />
);

const defaultProps = {
  slo: buildSlo(),
};

export const SloStatusBadge = Template.bind({});
SloStatusBadge.args = defaultProps;
