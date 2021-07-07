/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiImage,
  EuiFlexItem,
  EuiSpacer,
  EuiToolTip,
  EuiCodeBlock,
} from '@elastic/eui';
import React, { ComponentType } from 'react';
import { AgentIcon } from './index';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { AGENT_NAMES } from '../../../../common/agent_name';
import { getAgentIcon } from './get_agent_icon';
import { useTheme } from '../../../hooks/use_theme';

export default {
  title: 'shared/icons',
  component: AgentIcon,
  decorators: [
    (Story: ComponentType) => (
      <EuiThemeProvider>
        <Story />
      </EuiThemeProvider>
    ),
  ],
};

export function AgentIcons() {
  const theme = useTheme();

  return (
    <>
      <EuiCodeBlock language="html" isCopyable paddingSize="m">
        {'<AgentIcon agentName="dotnet" />'}
      </EuiCodeBlock>

      <EuiSpacer />

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
                          src={getAgentIcon(agentName, theme.darkMode)}
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
    </>
  );
}
