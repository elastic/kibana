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
  EuiText,
  EuiAvatar,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '../../hooks/use_navigation';
import { useAgentList } from '../../hooks/use_agent_list';
import { appPaths } from '../../app_paths';

export const HomeAssistantsSection: React.FC<{}> = () => {
  const { navigateToWorkchatUrl } = useNavigation();
  const { agents } = useAgentList();

  const assistantItems = agents.map((assistant) => (
    <EuiListGroupItem
      key={assistant.id}
      label={
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiAvatar
              name={assistant.name}
              initials={assistant.avatar?.text}
              color={assistant.avatar?.color}
              size="s"
            />
          </EuiFlexItem>
          <EuiFlexItem direction="column" grow={false}>
            <EuiText size="s">{assistant.name}</EuiText>
            <EuiText size="xs">{assistant.description}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      onClick={() => {
        navigateToWorkchatUrl(appPaths.chat.new({ agentId: assistant.id }));
      }}
      extraAction={{
        iconType: 'pencil',
        onClick: (e) => {
          e.stopPropagation();
          navigateToWorkchatUrl(appPaths.assistants.edit({ agentId: assistant.id }));
        },
      }}
      size="s"
    />
  ));

  return (
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            onClick={() => {
              navigateToWorkchatUrl(appPaths.assistants.list);
            }}
          >
            {i18n.translate('workchatApp.home.assistants.viewAll', {
              defaultMessage: 'View all',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiListGroup flush maxWidth={false} gutterSize="s">
        {assistantItems}
      </EuiListGroup>
    </EuiFlexItem>
  );
};
