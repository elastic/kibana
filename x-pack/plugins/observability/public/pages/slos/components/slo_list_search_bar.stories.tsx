/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { SloListSearchBar as Component, Props } from './slo_list_search_bar';
import { DEFAULT_STATE } from '../hooks/use_url_search_state';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloListSearchBar',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => <Component {...props} />;

const defaultProps: Props = {
  loading: false,
  onStateChange: () => {},
  initialState: DEFAULT_STATE,
};

export const SloListSearchBar = Template.bind({});
SloListSearchBar.args = defaultProps;
