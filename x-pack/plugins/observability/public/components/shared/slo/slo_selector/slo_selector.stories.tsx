/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { SLO } from '../../../../typings';
import { SloSelector as Component } from './slo_selector';

export default {
  component: Component,
  title: 'app/SLO/Shared/SloSelector',
};

const Template: ComponentStory<typeof Component> = () => (
  <Component onSelected={(slo: SLO | undefined) => console.log(slo)} />
);
const defaultProps = {};

export const Default = Template.bind({});
Default.args = defaultProps;
