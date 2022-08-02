/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiToolTip,
} from '@elastic/eui';
import type { Story } from '@storybook/react';
import React from 'react';
import { AGENT_NAMES } from '../../../../common/agent_name';
import { getAgentIcon } from './get_agent_icon';
import { AgentIcon } from '.';

export default {
  title: 'shared/AgentIcon',
  component: AgentIcon,
};

export const List: Story = (_args, { globals }) => {
  const darkMode = globals.euiTheme.includes('dark');

  return (
    <EuiFlexGroup gutterSize="l" wrap={true}>
      {AGENT_NAMES.map((agentName) => {
        return (
          <EuiFlexItem key={agentName} grow={false}>
            <EuiCard
              icon={
                <>
                  <p>
                    <EuiToolTip
                      position="top"
                      content="Icon rendered with `EuiImage`"
                    >
                      <EuiImage
                        size="s"
                        hasShadow
                        alt={agentName}
                        src={getAgentIcon(agentName, darkMode)}
                      />
                    </EuiToolTip>
                  </p>
                </>
              }
              title={agentName}
              description={
                <div>
                  <EuiToolTip
                    position="bottom"
                    content="Icon rendered with `AgentIcon`"
                  >
                    <AgentIcon agentName={agentName} />
                  </EuiToolTip>
                </div>
              }
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
