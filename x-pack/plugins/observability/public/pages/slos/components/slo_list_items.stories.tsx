/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { SloListItems as Component, SloListItemsProps } from './slo_list_items';
import { anSLO } from '../../../../common/data/slo';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloListItems',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: SloListItemsProps) => (
  <Component {...props} />
);

const defaultProps: SloListItemsProps = {
  slos: [anSLO, anSLO, anSLO],
  loading: false,
  error: false,
  onDeleted: () => {},
  onDeleting: () => {},
};

export const SloListItems = Template.bind({});
SloListItems.args = defaultProps;
