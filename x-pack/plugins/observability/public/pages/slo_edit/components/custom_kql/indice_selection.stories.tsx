/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '../../../../utils/kibana_react.storybook_decorator';
import { IndiceSelection as Component, Props } from './indice_selection';

export default {
  component: Component,
  title: 'app/SLO/EditPage/CustomKQL/IndiceSelection',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => {
  return <Component {...props} />;
};

const defaultProps = {};

export const IndiceSelection = Template.bind({});
IndiceSelection.args = defaultProps;
