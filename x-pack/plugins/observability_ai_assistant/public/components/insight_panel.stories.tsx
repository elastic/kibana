/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { InsightPanel as Component, InsightPanelProps } from './insight_panel';

export default {
  component: Component,
  title: 'app/Molecules/InsightPanel',
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = (props: InsightPanelProps) => (
  <Component {...props} />
);

const defaultProps = {
  title: 'Elastic Assistant',
};

export const InsightPanel = Template.bind({});
InsightPanel.args = defaultProps;
