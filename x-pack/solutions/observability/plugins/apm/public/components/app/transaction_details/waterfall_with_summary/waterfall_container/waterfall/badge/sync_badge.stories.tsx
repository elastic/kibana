/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SyncBadgeProps } from './sync_badge';
import { SyncBadge } from './sync_badge';

export default {
  title: 'app/TransactionDetails/Waterfall/Badge/SyncBadge',
  component: SyncBadge,
  argTypes: {
    sync: {
      control: { type: 'inline-radio', options: [true, false, undefined] },
    },
    agentName: {
      control: {
        type: 'select',
        options: [
          'nodejs',
          'js-base',
          'rum-js',
          'php',
          'python',
          'dotnet',
          'iOS/swift',
          'ruby',
          'java',
          'go',
        ],
      },
    },
  },
};

export function Example({ sync, agentName }: SyncBadgeProps) {
  return <SyncBadge sync={sync} agentName={agentName} />;
}
Example.args = { sync: true, agentName: 'nodejs' } as SyncBadgeProps;

export function BlockingBadgeExamples() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3>Blocking Badges (with tooltips)</h3>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Node.js:</span>
        <SyncBadge sync={true} agentName="nodejs" />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>JavaScript:</span>
        <SyncBadge sync={true} agentName="js-base" />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>RUM JavaScript:</span>
        <SyncBadge sync={true} agentName="rum-js" />
      </div>
    </div>
  );
}

export function AsyncBadgeExamples() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3>Async Badges (with tooltips)</h3>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Python:</span>
        <SyncBadge sync={false} agentName="python" />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>PHP:</span>
        <SyncBadge sync={false} agentName="php" />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>.NET:</span>
        <SyncBadge sync={false} agentName="dotnet" />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Java:</span>
        <SyncBadge sync={false} agentName="java" />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Ruby:</span>
        <SyncBadge sync={false} agentName="ruby" />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Go:</span>
        <SyncBadge sync={false} agentName="go" />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>iOS/Swift:</span>
        <SyncBadge sync={false} agentName="iOS/swift" />
      </div>
    </div>
  );
}

export function NoRenderExamples() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3>No Badge Rendered (edge cases)</h3>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Node.js (sync=false):</span>
        <SyncBadge sync={false} agentName="nodejs" />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Python (sync=true):</span>
        <SyncBadge sync={true} agentName="python" />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Node.js (sync=undefined):</span>
        <SyncBadge sync={undefined} agentName="nodejs" />
      </div>
    </div>
  );
}
