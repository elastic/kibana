/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SyncBadge } from '.';
import { agentsSyncMap } from './helper';

const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' };

const meta = {
  title: 'shared/TraceWaterfall/Badges/SyncBadge',
  component: SyncBadge,
  argTypes: {
    sync: {
      control: { type: 'radio' },
      options: [true, false, undefined],
      description: 'Whether the span was executed synchronously or asynchronously',
    },
    agentName: {
      control: { type: 'select' },
      options: Array.from(agentsSyncMap.keys()),
      description: 'The APM agent name',
    },
  },
} satisfies Meta<typeof SyncBadge>;

export default meta;
type Story = StoryObj<typeof SyncBadge>;

export const Example: Story = {
  args: {
    sync: true,
    agentName: 'nodejs',
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive example to test different sync/async combinations with various agents.',
      },
    },
  },
};

export const BlockingBadgeExamples: Story = {
  render: () => {
    return (
      <div style={columnStyle}>
        <h3>Blocking Badges (with tooltips)</h3>
        <div style={rowStyle}>
          <span>Node.js:</span>
          <SyncBadge sync={true} agentName="nodejs" />
        </div>
        <div style={rowStyle}>
          <span>JavaScript:</span>
          <SyncBadge sync={true} agentName="js-base" />
        </div>
        <div style={rowStyle}>
          <span>RUM JavaScript:</span>
          <SyncBadge sync={true} agentName="rum-js" />
        </div>
      </div>
    );
  },
  parameters: {
    controls: { disable: true },
    actions: { disable: true },
    docs: {
      description: {
        story:
          'Examples of blocking badges for agents that operate synchronously (Node.js, JavaScript).',
      },
    },
  },
};

export const AsyncBadgeExamples: Story = {
  render: () => {
    return (
      <div style={columnStyle}>
        <h3>Async Badges (with tooltips)</h3>
        <div style={rowStyle}>
          <span>Python:</span>
          <SyncBadge sync={false} agentName="python" />
        </div>
        <div style={rowStyle}>
          <span>PHP:</span>
          <SyncBadge sync={false} agentName="php" />
        </div>
        <div style={rowStyle}>
          <span>.NET:</span>
          <SyncBadge sync={false} agentName="dotnet" />
        </div>
        <div style={rowStyle}>
          <span>Java:</span>
          <SyncBadge sync={false} agentName="java" />
        </div>
        <div style={rowStyle}>
          <span>Ruby:</span>
          <SyncBadge sync={false} agentName="ruby" />
        </div>
        <div style={rowStyle}>
          <span>Go:</span>
          <SyncBadge sync={false} agentName="go" />
        </div>
        <div style={rowStyle}>
          <span>iOS/Swift:</span>
          <SyncBadge sync={false} agentName="iOS/swift" />
        </div>
      </div>
    );
  },
  parameters: {
    controls: { disable: true },
    actions: { disable: true },
    docs: {
      description: {
        story:
          'Examples of async badges for agents that operate asynchronously (Python, PHP, Java, etc).',
      },
    },
  },
};

export const NoRenderExamples: Story = {
  render: () => {
    return (
      <div style={columnStyle}>
        <h3>No Badge Rendered (edge cases)</h3>
        <div style={rowStyle}>
          <span>Node.js (sync=false):</span>
          <SyncBadge sync={false} agentName="nodejs" />
        </div>
        <div style={rowStyle}>
          <span>Python (sync=true):</span>
          <SyncBadge sync={true} agentName="python" />
        </div>
        <div style={rowStyle}>
          <span>Node.js (sync=undefined):</span>
          <SyncBadge sync={undefined} agentName="nodejs" />
        </div>
        <div style={rowStyle}>
          <span>OTEL without agentName (sync=true):</span>
          <SyncBadge sync={true} agentName={undefined} />
        </div>
        <div style={rowStyle}>
          <span>OTEL without metadata (both undefined):</span>
          <SyncBadge sync={undefined} agentName={undefined} />
        </div>
      </div>
    );
  },
  parameters: {
    controls: { disable: true },
    actions: { disable: true },
    docs: {
      description: {
        story:
          'Edge cases where no badge should be rendered due to mismatched or missing metadata.',
      },
    },
  },
};
