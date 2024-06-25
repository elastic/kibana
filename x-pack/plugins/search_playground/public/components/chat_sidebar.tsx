/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWatch } from 'react-hook-form';
import { ChatForm, ChatFormFields } from '../types';
import { useManagementLink } from '../hooks/use_management_link';
import { SourcesPanelSidebar } from './sources_panel/sources_panel_sidebar';
import { SummarizationPanel } from './summarization_panel/summarization_panel';

interface ChatSidebarProps {
  selectedIndicesCount: number;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ selectedIndicesCount }) => {
  const { euiTheme } = useEuiTheme();
  const selectedModel = useWatch<ChatForm, ChatFormFields.summarizationModel>({
    name: ChatFormFields.summarizationModel,
  });
  const managementLink = useManagementLink(selectedModel.connectorId);
  const panels = [
    {
      title: i18n.translate('xpack.searchPlayground.sidebar.summarizationTitle', {
        defaultMessage: 'Model settings',
      }),
      children: <SummarizationPanel />,
      extraAction: (
        <EuiButtonEmpty
          target="_blank"
          href={managementLink}
          data-test-subj="manageConnectorsLink"
          iconType="wrench"
          size="s"
          aria-label={i18n.translate(
            'xpack.searchPlayground.sidebar.summarizationModel.manageConnectorLink',
            {
              defaultMessage: 'Manage connector',
            }
          )}
        >
          <FormattedMessage
            id="xpack.searchPlayground.sidebar.summarizationModel.manageConnectorTooltip"
            defaultMessage="Manage"
          />
        </EuiButtonEmpty>
      ),
    },
    {
      title: i18n.translate('xpack.searchPlayground.sidebar.sourceTitle', {
        defaultMessage: 'Indices',
      }),
      extraAction: !!selectedIndicesCount && (
        <EuiText size="xs">
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.sidebar.sourceIndicesCount"
              defaultMessage="{count, number} {count, plural, one {Index} other {Indices}}"
              values={{ count: Number(selectedIndicesCount) }}
            />
          </p>
        </EuiText>
      ),
      children: <SourcesPanelSidebar />,
    },
  ];

  return (
    <EuiFlexGroup direction="column" className="eui-yScroll" gutterSize="none">
      {panels?.map(({ title, children, extraAction }) => (
        <EuiFlexGroup
          key={title}
          direction="column"
          css={{ padding: euiTheme.size.l }}
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
              <EuiTitle size="xs">
                <h4>{title}</h4>
              </EuiTitle>
              {extraAction && <EuiFlexItem grow={false}>{extraAction}</EuiFlexItem>}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPanel>{children}</EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </EuiFlexGroup>
  );
};
