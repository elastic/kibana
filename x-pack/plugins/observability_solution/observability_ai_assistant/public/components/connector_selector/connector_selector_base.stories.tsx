/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import { FindActionResult } from '@kbn/actions-plugin/server';
import { ComponentProps } from 'react';
import { EuiPanel } from '@elastic/eui';
import { ConnectorSelectorBase as Component } from './connector_selector_base';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Molecules/ConnectorSelectorBase',
};

export default meta;

const render = (props: ComponentProps<typeof Component>) => {
  return (
    <EuiPanel hasBorder hasShadow={false}>
      <Component {...props} />
    </EuiPanel>
  );
};

export const Loaded: ComponentStoryObj<typeof Component> = {
  args: {
    loading: false,
    selectedConnector: 'gpt-4',
    connectors: [
      { id: 'gpt-4', name: 'OpenAI GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'OpenAI GPT-3.5 Turbo' },
    ] as FindActionResult[],
  },
  render,
};

export const Loading: ComponentStoryObj<typeof Component> = {
  args: {
    loading: true,
  },
  render,
};

export const Empty: ComponentStoryObj<typeof Component> = {
  args: {
    loading: false,
    connectors: [],
  },
  render,
};

export const FailedToLoad: ComponentStoryObj<typeof Component> = {
  args: {
    loading: false,
    error: new Error('Failed to load connectors'),
  },
  render,
};
