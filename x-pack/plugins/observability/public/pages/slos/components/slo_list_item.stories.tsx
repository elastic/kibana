/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import {
  HEALTHY_ROLLING_SLO,
  historicalSummaryData,
} from '../../../fixtures/slo/historical_summary_data';
import { buildSlo } from '../../../fixtures/slo/slo';
import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { SloListItem as Component, SloListItemProps } from './slo_list_item';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloListItem',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: SloListItemProps) => (
  <Component {...props} />
);

const defaultProps = {
  slo: buildSlo(),
  historicalSummary: historicalSummaryData[HEALTHY_ROLLING_SLO],
};

export const SloListItem = Template.bind({});
SloListItem.args = defaultProps;
