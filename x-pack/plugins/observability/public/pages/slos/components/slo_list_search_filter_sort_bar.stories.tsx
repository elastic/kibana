/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import {
  SloListSearchFilterSortBar as Component,
  SloListSearchFilterSortBarProps,
} from './slo_list_search_filter_sort_bar';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloListSearchFilterSortBar',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: SloListSearchFilterSortBarProps) => (
  <Component {...props} />
);

const defaultProps: SloListSearchFilterSortBarProps = {
  loading: false,
  onChangeQuery: () => {},
  onChangeSort: () => {},
  onChangeIndicatorTypeFilter: () => {},
};

export const SloListSearchFilterSortBar = Template.bind({});
SloListSearchFilterSortBar.args = defaultProps;
