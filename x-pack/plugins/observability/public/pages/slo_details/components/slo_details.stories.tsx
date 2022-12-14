/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { anSLO } from '../../../../common/data/slo';
import { SloDetails as Component, Props } from './slo_details';

export default {
  component: Component,
  title: 'app/SLO/DetailsPage/SloDetails',
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = (props: Props) => <Component {...props} />;

const defaultProps: Props = {
  slo: anSLO,
};

export const SloDetails = Template.bind({});
SloDetails.args = defaultProps;
