/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { SlosWelcomePage as Component } from './slos_welcome';
import { KibanaReactStorybookDecorator } from '../../utils/kibana_react.storybook_decorator';

export default {
  component: Component,
  title: 'app/SLO/SlosWelcomePage',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = () => <Component />;

export const SloListWelcomePrompt = Template.bind({});
