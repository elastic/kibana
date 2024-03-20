/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '@kbn/observability-plugin/public';
import { SloListSearchBar as Component } from './slo_list_search_bar';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloListSearchBar',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = () => <Component />;

export const SloListSearchBar = Template.bind({});
