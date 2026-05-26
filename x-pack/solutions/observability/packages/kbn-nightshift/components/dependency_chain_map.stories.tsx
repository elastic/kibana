/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { DependencyChainMap } from './dependency_chain_map';

const meta: Meta<typeof DependencyChainMap> = {
  title: 'app/Nightshift/DependencyChainMap',
  component: DependencyChainMap,
};

export default meta;
type Story = StoryObj<typeof DependencyChainMap>;

export const PaymentFailureChain: Story = {
  args: {
    dependencyEdges: [
      { source: 'checkout', target: 'payment', protocol: 'grpc', exposure: 'exposed' },
      { source: 'payment', target: 'upstream:9999', protocol: 'tcp', exposure: 'not_exposed' },
    ],
    causeKis: [{ name: 'payment', streamName: 'logs.otel' }],
  },
};

export const MultiServiceChain: Story = {
  args: {
    dependencyEdges: [
      { source: 'frontend', target: 'checkout', protocol: 'http', exposure: 'exposed' },
      { source: 'checkout', target: 'payment', protocol: 'grpc', exposure: 'exposed' },
      { source: 'checkout', target: 'product-catalog', protocol: 'grpc', exposure: 'not_exposed' },
      { source: 'payment', target: 'upstream:9999', protocol: 'tcp', exposure: 'not_exposed' },
    ],
    causeKis: [
      { name: 'payment', streamName: 'logs.otel' },
      { name: 'upstream:9999', streamName: 'logs.otel' },
    ],
  },
};

export const SingleEdge: Story = {
  args: {
    dependencyEdges: [
      { source: 'frontend', target: 'cart', protocol: 'grpc', exposure: 'not_exposed' },
    ],
    causeKis: [{ name: 'frontend', streamName: 'logs.otel' }],
  },
};
