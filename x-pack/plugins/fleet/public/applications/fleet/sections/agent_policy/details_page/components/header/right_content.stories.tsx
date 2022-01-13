/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { HeaderRightContent as Component } from './right_content';

export default {
  component: Component,
  title: 'Sections/Fleet/AgentPolicyDetails/Header/RightContent',
};

export const HeaderRightContent = () => {
  return (
    <div style={{ maxWidth: '800px' }}>
      <Component
        policyId="test123"
        isLoading={false}
        addAgent={() => {}}
        isAddAgentHelpPopoverOpen={false}
        setIsAddAgentHelpPopoverOpen={() => {}}
        agentPolicy={
          {
            id: 'test123',
            revision: 1,
            updated_at: new Date().toISOString(),
            package_policies: ['test1', 'test2'],
          } as any
        }
        agentStatus={
          {
            total: 0,
          } as any
        }
      />
    </div>
  );
};

export const HeaderRightContentWithManagedPolicy = () => {
  return (
    <div style={{ maxWidth: '800px' }}>
      <Component
        policyId="test123"
        isLoading={false}
        addAgent={() => {}}
        isAddAgentHelpPopoverOpen={false}
        setIsAddAgentHelpPopoverOpen={() => {}}
        agentPolicy={
          {
            id: 'test123',
            revision: 1,
            updated_at: new Date().toISOString(),
            package_policies: ['test1', 'test2'],
            is_managed: true,
          } as any
        }
        agentStatus={
          {
            total: 0,
          } as any
        }
      />
    </div>
  );
};
