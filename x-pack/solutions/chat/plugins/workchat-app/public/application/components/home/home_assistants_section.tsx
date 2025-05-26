/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiLink,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiFlexGrid,
  EuiText,
  EuiAvatar,
  EuiPanel,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '../../hooks/use_navigation';
import { useAgentList } from '../../hooks/use_agent_list';
import { appPaths } from '../../app_paths';

export const HomeAssistantsSection: React.FC<{}> = () => {
  const { createWorkchatUrl, navigateToWorkchatUrl } = useNavigation();
  const { agents } = useAgentList();

  const assistantTiles = agents.map((assistant) => {
    return (
      <EuiPanel key={assistant.id} paddingSize="m" hasBorder={true}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiAvatar
              size="l"
              name={assistant.name}
              initials={assistant.avatar?.text}
              color={assistant.avatar?.color}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="gear"
              color="text"
              onClick={() => {
                navigateToWorkchatUrl(appPaths.assistants.edit({ agentId: assistant.id }));
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiLink
              href={createWorkchatUrl(appPaths.chat.new({ agentId: assistant.id }))}
              style={{ fontWeight: 'bold' }}
            >
              {assistant.name}
            </EuiLink>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              {assistant.description}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  });

  return (
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiIcon type="users" size="m" />
        <EuiTitle size="xxs">
          <h4>
            {i18n.translate('workchatApp.home.assistants.title', {
              defaultMessage: 'Assistants',
            })}
          </h4>
        </EuiTitle>
      </EuiFlexGroup>

      <EuiSpacer />
      <EuiFlexGrid columns={3}>{assistantTiles}</EuiFlexGrid>
      <EuiSpacer />
    </EuiFlexItem>
  );
};
